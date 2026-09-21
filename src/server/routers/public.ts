// src/server/routers/public.ts
import { z } from "zod";
import { and, eq, lt, gt, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { addMinutes, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../trpc";
import { emitNotification } from "../notifications/service";
import { organizations, bookingPolicies } from "@/db/schema/organizations";
import { businessHours } from "@/db/schema/availability";
import { services } from "@/db/schema/services";
import { staffProfiles, staffServices } from "@/db/schema/staff";
import { customers } from "@/db/schema/customers";
import { appointments, appointmentStatusHistory } from "@/db/schema/appointments";
import {
  generateAvailableSlots,
  validateRequestedSlot,
  type StaffAvailability,
} from "@/lib/scheduling/availability";
import { createBookingSchema, isValidTransition } from "@/lib/validations";
import { gatherDayContext, localDateStr } from "../scheduling-context";
import { rateLimit } from "@/lib/rate-limit";

export const publicRouter = router({
  ping: publicProcedure.query(() => "pong"),

  getBusinessBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.query.organizations.findFirst({
        where: and(eq(organizations.slug, input.slug), eq(organizations.isActive, true)),
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logoUrl: org.logoUrl,
        timezone: org.timezone,
        currency: org.currency,
        phone: org.phone,
        email: org.email,
        address: org.address,
        city: org.city,
        country: org.country,
        isDemo: org.isDemo,
      };
    }),

  getPublicPolicies: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      if (!org?.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });

      const policy = await ctx.db.query.bookingPolicies.findFirst({
        where: eq(bookingPolicies.organizationId, org.id),
      });
      const hours = await ctx.db.query.businessHours.findMany({
        where: eq(businessHours.organizationId, org.id),
      });

      return {
        cancellationWindowHours: policy?.cancellationWindowHours ?? 24,
        rescheduleWindowHours: policy?.rescheduleWindowHours ?? 24,
        autoConfirmBookings: policy?.autoConfirmBookings ?? true,
        privacyNotice: policy?.privacyNotice ?? null,
        bookingTerms: policy?.bookingTerms ?? null,
        allowStaffSelection: org.settings?.allowStaffSelection ?? true,
        businessHours: hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
        })),
      };
    }),

  listActiveServices: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.services.findMany({
        where: and(
          eq(services.organizationId, input.organizationId),
          eq(services.isActive, true),
          eq(services.isArchived, false)
        ),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });
      return rows.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        shortDescription: s.shortDescription,
        durationMinutes: s.durationMinutes,
        priceFils: s.priceFils,
        depositFils: s.depositFils,
        depositType: s.depositType,
        categoryId: s.categoryId,
        icon: s.icon,
        bookingInstructions: s.bookingInstructions,
      }));
    }),

  listEligibleStaff: publicProcedure
    .input(z.object({ organizationId: z.string(), serviceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const staff = await ctx.db.query.staffProfiles.findMany({
        where: and(eq(staffProfiles.organizationId, input.organizationId), eq(staffProfiles.isActive, true)),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });

      let eligible = staff;
      if (input.serviceId) {
        const links = await ctx.db.query.staffServices.findMany({
          where: eq(staffServices.serviceId, input.serviceId),
        });
        const ids = new Set(links.map((l) => l.staffId));
        eligible = staff.filter((s) => ids.has(s.id));
      }

      return eligible.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        role: s.role,
        bio: s.bio,
        profileImageUrl: s.profileImageUrl,
      }));
    }),

  getAvailability: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        serviceId: z.string(),
        staffId: z.string().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      if (!org?.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });

      const service = await ctx.db.query.services.findFirst({
        where: and(
          eq(services.id, input.serviceId),
          eq(services.organizationId, org.id),
          eq(services.isActive, true),
          eq(services.isArchived, false)
        ),
      });
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const links = await ctx.db.query.staffServices.findMany({
        where: eq(staffServices.serviceId, service.id),
      });
      let staffIds = links.map((l) => l.staffId);
      if (input.staffId) staffIds = staffIds.filter((id) => id === input.staffId);

      const day = await gatherDayContext(ctx.db, org.id, staffIds, input.date, org.timezone);
      const settings = org.settings ?? {};

      const result = generateAvailableSlots({
        date: input.date,
        timezone: org.timezone,
        serviceDuration: service.durationMinutes,
        bufferBefore: service.bufferBeforeMinutes,
        bufferAfter: service.bufferAfterMinutes,
        slotInterval: settings.slotInterval ?? 30,
        businessHours: day.businessHours,
        temporarilyClosed: settings.isTemporarilyClosed ?? false,
        staffMembers: day.staff,
        existingAppointments: day.appointments,
        holidays: day.holidays,
        minimumNoticeMinutes: settings.minimumNoticeMinutes ?? 60,
        maxBookingDaysAhead: settings.maxBookingDaysAhead ?? 30,
        now: new Date(),
      });

      return {
        date: result.date,
        timezone: org.timezone,
        service: {
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceFils: service.priceFils,
        },
        eligibleStaff: result.eligibleStaff,
        slots: result.slots,
        noAvailabilityReason: result.noAvailabilityReason ?? null,
      };
    }),

  createBooking: publicProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      // 🛡️ Abuse protection: max 5 attempts per email+business per 10 minutes
      const rl = rateLimit(
        `booking:${input.organizationSlug}:${input.customerEmail.trim().toLowerCase()}`,
        5,
        10 * 60 * 1000
      );
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many booking attempts. Please try again in ${rl.retryAfterSec} seconds.`,
        });
      }

      const org = await ctx.db.query.organizations.findFirst({
        where: and(eq(organizations.slug, input.organizationSlug), eq(organizations.isActive, true)),
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      const settings = org.settings ?? {};

      const service = await ctx.db.query.services.findFirst({
        where: and(
          eq(services.id, input.serviceId),
          eq(services.organizationId, org.id),
          eq(services.isActive, true),
          eq(services.isArchived, false)
        ),
      });
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid start time" });
      }
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000);
      const dateStr = localDateStr(input.startsAt, org.timezone);

      const links = await ctx.db.query.staffServices.findMany({
        where: eq(staffServices.serviceId, service.id),
      });
      let candidateIds = links.map((l) => l.staffId);
      if (input.staffId) {
        if (!candidateIds.includes(input.staffId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This professional cannot perform the selected service" });
        }
        candidateIds = [input.staffId];
      }
      if (candidateIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No staff available for this service" });
      }

      const day = await gatherDayContext(ctx.db, org.id, candidateIds, dateStr, org.timezone);

      if (settings.isTemporarilyClosed) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Business is temporarily closed" });
      }
      if (day.holidays.length || !day.businessHours?.isOpen) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Business is closed on this day" });
      }
      const now = new Date();
      if (startsAt < addMinutes(now, settings.minimumNoticeMinutes ?? 60)) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Too late to book this slot" });
      }
      const daysDiff = Math.floor(
        (startOfDay(toZonedTime(startsAt, org.timezone)).getTime() -
          startOfDay(toZonedTime(now, org.timezone)).getTime()) / 86400000
      );
      if (daysDiff > (settings.maxBookingDaysAhead ?? 30)) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Booking window exceeded" });
      }

      let assignedStaff: StaffAvailability | null = null;
      for (const staff of day.staff) {
        const check = validateRequestedSlot({
          timezone: org.timezone,
          date: dateStr,
          startsAt,
          endsAt,
          bufferBefore: service.bufferBeforeMinutes,
          bufferAfter: service.bufferAfterMinutes,
          staff,
          businessHours: day.businessHours,
          existingAppointments: day.appointments,
        });
        if (check.ok) {
          assignedStaff = staff;
          break;
        }
      }
      if (!assignedStaff) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This time slot is no longer available. Please choose another time.",
        });
      }

      const policy = await ctx.db.query.bookingPolicies.findFirst({
        where: eq(bookingPolicies.organizationId, org.id),
      });
      const initialStatus = policy?.autoConfirmBookings ?? true ? "confirmed" : "pending";

      const booking = await ctx.db.transaction(async (tx) => {
        const bufferedStart = new Date(startsAt.getTime() - service.bufferBeforeMinutes * 60000);
        const bufferedEnd = new Date(endsAt.getTime() + service.bufferAfterMinutes * 60000);

        const conflict = await tx.query.appointments.findFirst({
          where: and(
            eq(appointments.staffId, assignedStaff!.id),
            eq(appointments.organizationId, org.id),
            lt(appointments.startsAt, bufferedEnd),
            gt(appointments.endsAt, bufferedStart),
            ne(appointments.status, "cancelled")
          ),
        });
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This time slot was just taken. Please choose another time.",
          });
        }

        const normalizedEmail = input.customerEmail.trim().toLowerCase();
        const normalizedPhone = input.customerPhone.replace(/[^\d+]/g, "");
        let customer = await tx.query.customers.findFirst({
          where: and(eq(customers.organizationId, org.id), eq(customers.normalizedEmail, normalizedEmail)),
        });
        if (!customer && normalizedPhone) {
          customer = await tx.query.customers.findFirst({
            where: and(eq(customers.organizationId, org.id), eq(customers.normalizedPhone, normalizedPhone)),
          });
        }

        let customerId: string;
        if (customer) {
          customerId = customer.id;
          await tx
            .update(customers)
            .set({ name: input.customerName, updatedAt: new Date() })
            .where(eq(customers.id, customer.id));
        } else {
          customerId = nanoid();
          await tx.insert(customers).values({
            id: customerId,
            organizationId: org.id,
            name: input.customerName,
            email: normalizedEmail,
            phone: input.customerPhone,
            normalizedEmail,
            normalizedPhone,
            consentGiven: input.consentGiven,
          });
        }

        const appointmentId = nanoid();
        const manageToken = nanoid(32);

        await tx.insert(appointments).values({
          id: appointmentId,
          organizationId: org.id,
          serviceId: service.id,
          staffId: assignedStaff!.id,
          customerId,
          startsAt,
          endsAt,
          status: initialStatus,
          priceFils: service.priceFils,
          depositFils: service.depositFils,
          paymentStatus: service.depositFils > 0 ? "pending" : "not_required",
          customerNotes: input.customerNotes ?? null,
          manageToken,
        });

        await tx.insert(appointmentStatusHistory).values({
          id: nanoid(),
          appointmentId,
          fromStatus: null,
          toStatus: initialStatus,
          changedBy: "customer",
        });

        await emitNotification(tx, {
          organizationId: org.id,
          type: "booking_created",
          recipientType: "customer",
          recipientId: customerId,
          recipientEmail: normalizedEmail,
          subject: `Your appointment at ${org.name}`,
          body: `Demo notification: ${service.name} on ${dateStr}. No real email or SMS was sent.`,
          channel: "internal",
          relatedAppointmentId: appointmentId,
        });

        return { appointmentId, manageToken, status: initialStatus };
      });

      return {
        reference: booking.appointmentId,
        manageToken: booking.manageToken,
        status: booking.status,
        service: { name: service.name, durationMinutes: service.durationMinutes, priceFils: service.priceFils },
        staffName: assignedStaff.name,
        startsAtISO: startsAt.toISOString(),
        endsAtISO: endsAt.toISOString(),
        timezone: org.timezone,
      };
    }),

  getBookingByToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ ctx, input }) => {
      const apt = await ctx.db.query.appointments.findFirst({
        where: eq(appointments.manageToken, input.token),
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      const [service, staff, customer, org] = await Promise.all([
        ctx.db.query.services.findFirst({ where: eq(services.id, apt.serviceId) }),
        ctx.db.query.staffProfiles.findFirst({ where: eq(staffProfiles.id, apt.staffId) }),
        ctx.db.query.customers.findFirst({ where: eq(customers.id, apt.customerId) }),
        ctx.db.query.organizations.findFirst({ where: eq(organizations.id, apt.organizationId) }),
      ]);

      return {
        reference: apt.id,
        status: apt.status,
        startsAtISO: apt.startsAt.toISOString(),
        endsAtISO: apt.endsAt.toISOString(),
        timezone: org?.timezone ?? "Asia/Dubai",
        serviceName: service?.name ?? null,
        staffName: staff?.name ?? null,
        customerName: customer?.name ?? null,
        priceFils: apt.priceFils,
        businessName: org?.name ?? null,
      };
    }),

  cancelBookingByToken: publicProcedure
    .input(z.object({ token: z.string().min(10), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const rl = rateLimit(`cancel:${input.token}`, 10, 10 * 60 * 1000);
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many attempts. Please try again in ${rl.retryAfterSec} seconds.`,
        });
      }

      const apt = await ctx.db.query.appointments.findFirst({
        where: eq(appointments.manageToken, input.token),
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      if (!isValidTransition(apt.status, "cancelled")) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This booking can no longer be cancelled" });
      }

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, apt.organizationId),
      });
      const policy = org
        ? await ctx.db.query.bookingPolicies.findFirst({ where: eq(bookingPolicies.organizationId, org.id) })
        : null;
      const windowHours = policy?.cancellationWindowHours ?? 24;

      const hoursUntilStart = (apt.startsAt.getTime() - Date.now()) / 3600000;
      if (hoursUntilStart < windowHours) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cancellations are only allowed up to ${windowHours} hours before the appointment`,
        });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(appointments)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            cancellationReason: input.reason ?? null,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, apt.id));

        await tx.insert(appointmentStatusHistory).values({
          id: nanoid(),
          appointmentId: apt.id,
          fromStatus: apt.status,
          toStatus: "cancelled",
          changedBy: "customer",
          reason: input.reason ?? null,
        });

        await emitNotification(tx, {
          organizationId: apt.organizationId,
          type: "booking_cancelled",
          recipientType: "customer",
          recipientId: apt.customerId,
          recipientEmail: null,
          subject: "Your appointment was cancelled",
          body: "Demo notification: booking cancelled. No real email or SMS was sent.",
          channel: "internal",
          relatedAppointmentId: apt.id,
        });
      });

      return { status: "cancelled" as const };
    }),
});
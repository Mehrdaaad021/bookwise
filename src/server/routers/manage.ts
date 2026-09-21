// src/server/routers/manage.ts
import { z } from "zod";
import { and, eq, lt, gt, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { addMinutes, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../trpc";
import { emitNotification } from "../notifications/service";
import { organizations, bookingPolicies } from "@/db/schema/organizations";
import { services } from "@/db/schema/services";
import { staffProfiles } from "@/db/schema/staff";
import { customers } from "@/db/schema/customers";
import { appointments, appointmentStatusHistory } from "@/db/schema/appointments";
import { validateRequestedSlot } from "@/lib/scheduling/availability";
import { gatherDayContext, localDateStr } from "../scheduling-context";
import { rateLimit } from "@/lib/rate-limit";

const RESCHEDULABLE = ["pending", "confirmed"];

export const manageRouter = router({
  getBookingForManage: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ ctx, input }) => {
      const apt = await ctx.db.query.appointments.findFirst({
        where: eq(appointments.manageToken, input.token),
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      const [service, staff, customer, org, policy] = await Promise.all([
        ctx.db.query.services.findFirst({ where: eq(services.id, apt.serviceId) }),
        ctx.db.query.staffProfiles.findFirst({ where: eq(staffProfiles.id, apt.staffId) }),
        ctx.db.query.customers.findFirst({ where: eq(customers.id, apt.customerId) }),
        ctx.db.query.organizations.findFirst({ where: eq(organizations.id, apt.organizationId) }),
        ctx.db.query.bookingPolicies.findFirst({ where: eq(bookingPolicies.organizationId, apt.organizationId) }),
      ]);

      return {
        reference: apt.id,
        status: apt.status,
        startsAtISO: apt.startsAt.toISOString(),
        endsAtISO: apt.endsAt.toISOString(),
        timezone: org?.timezone ?? "Asia/Dubai",
        serviceName: service?.name ?? null,
        serviceId: apt.serviceId,
        staffName: staff?.name ?? null,
        staffId: apt.staffId,
        organizationId: apt.organizationId,
        organizationSlug: org?.slug ?? null,
        customerName: customer?.name ?? null,
        priceFils: apt.priceFils,
        businessName: org?.name ?? null,
        cancellationWindowHours: policy?.cancellationWindowHours ?? 24,
        rescheduleWindowHours: policy?.rescheduleWindowHours ?? 24,
        canReschedule: RESCHEDULABLE.includes(apt.status),
      };
    }),

  requestRescheduleByToken: publicProcedure
    .input(z.object({ token: z.string().min(10), newStartsAt: z.string().datetime() }))
    .mutation(async ({ ctx, input }) => {
      const rl = rateLimit(`reschedule:${input.token}`, 10, 10 * 60 * 1000);
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many attempts. Try again in ${rl.retryAfterSec} seconds.`,
        });
      }

      const apt = await ctx.db.query.appointments.findFirst({
        where: eq(appointments.manageToken, input.token),
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (!RESCHEDULABLE.includes(apt.status)) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This booking can no longer be rescheduled" });
      }

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, apt.organizationId),
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      const settings = org.settings ?? {};
      const policy = await ctx.db.query.bookingPolicies.findFirst({
        where: eq(bookingPolicies.organizationId, org.id),
      });
      const windowHours = policy?.rescheduleWindowHours ?? 24;

      const hoursUntilStart = (apt.startsAt.getTime() - Date.now()) / 3600000;
      if (hoursUntilStart < windowHours) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Rescheduling is only allowed up to ${windowHours} hours before the appointment`,
        });
      }

      const service = await ctx.db.query.services.findFirst({ where: eq(services.id, apt.serviceId) });
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const startsAt = new Date(input.newStartsAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid new start time" });
      }
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000);
      const dateStr = localDateStr(input.newStartsAt, org.timezone);

      if (settings.isTemporarilyClosed) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Business is temporarily closed" });
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

      const day = await gatherDayContext(ctx.db, org.id, [apt.staffId], dateStr, org.timezone);
      if (day.holidays.length || !day.businessHours?.isOpen) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Business is closed on this day" });
      }

      const staff = day.staff.find((s) => s.id === apt.staffId);
      if (!staff) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The assigned professional is not available on this day",
        });
      }

      const others = day.appointments.filter(
        (a) => !(a.staffId === apt.staffId && a.startsAt.getTime() === apt.startsAt.getTime())
      );

      const check = validateRequestedSlot({
        timezone: org.timezone,
        date: dateStr,
        startsAt,
        endsAt,
        bufferBefore: service.bufferBeforeMinutes,
        bufferAfter: service.bufferAfterMinutes,
        staff,
        businessHours: day.businessHours,
        existingAppointments: others,
      });
      if (!check.ok) {
        throw new TRPCError({ code: "CONFLICT", message: check.reason });
      }

      await ctx.db.transaction(async (tx) => {
        const bufferedStart = new Date(startsAt.getTime() - service.bufferBeforeMinutes * 60000);
        const bufferedEnd = new Date(endsAt.getTime() + service.bufferAfterMinutes * 60000);

        const conflict = await tx.query.appointments.findFirst({
          where: and(
            eq(appointments.staffId, apt.staffId),
            eq(appointments.organizationId, apt.organizationId),
            ne(appointments.id, apt.id),
            ne(appointments.status, "cancelled"),
            lt(appointments.startsAt, bufferedEnd),
            gt(appointments.endsAt, bufferedStart)
          ),
        });
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That slot was just taken. Please choose another time.",
          });
        }

        await tx
          .update(appointments)
          .set({ startsAt, endsAt, updatedAt: new Date() })
          .where(eq(appointments.id, apt.id));

        await tx.insert(appointmentStatusHistory).values({
          id: nanoid(),
          appointmentId: apt.id,
          fromStatus: apt.status,
          toStatus: apt.status,
          changedBy: "customer",
          reason: `Rescheduled to ${startsAt.toISOString()}`,
        });

        await emitNotification(tx, {
          organizationId: apt.organizationId,
          type: "booking_rescheduled",
          recipientType: "customer",
          recipientId: apt.customerId,
          recipientEmail: null,
          subject: "Your appointment was rescheduled",
          body: "Demo notification: booking rescheduled. No real email or SMS was sent.",
          channel: "internal",
          relatedAppointmentId: apt.id,
        });
      });

      return {
        startsAtISO: startsAt.toISOString(),
        endsAtISO: endsAt.toISOString(),
        status: apt.status,
      };
    }),
});
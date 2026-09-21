// src/server/routers/workspace.ts
import { z } from "zod";
import { addDays, format } from "date-fns";
import { and, eq, gte, lt, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { nanoid } from "nanoid";
import { isValidTransition } from "@/lib/validations";
import { protectedProcedure, requireOrgMembership, router } from "../trpc";
import { recordAudit } from "../audit";
import { emitNotification } from "../notifications/service";
import { organizationMembers, organizations } from "@/db/schema/organizations";
import { appointments, appointmentStatusHistory } from "@/db/schema/appointments";
import { customers } from "@/db/schema/customers";
import { services } from "@/db/schema/services";
import { staffProfiles } from "@/db/schema/staff";

export const workspaceRouter = router({
  getMyWorkspace: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, ctx.userId), eq(organizationMembers.isActive, true)),
    });
    if (!membership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No workspace for your account yet" });
    }
    const org = await ctx.db.query.organizations.findFirst({
      where: eq(organizations.id, membership.organizationId),
    });
    if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        timezone: org.timezone,
        currency: org.currency,
        isDemo: org.isDemo,
      },
      role: membership.role,
    };
  }),

  getDashboard: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";
      const now = new Date();
      const todayStr = format(toZonedTime(now, tz), "yyyy-MM-dd");
      const dayStart = fromZonedTime(`${todayStr}T00:00:00`, tz);
      const dayEnd = fromZonedTime(`${todayStr}T23:59:59`, tz);

      const [todayApts, upcomingApts, customerCount, revenueRows] = await Promise.all([
        ctx.db.query.appointments.findMany({
          where: and(
            eq(appointments.organizationId, input.organizationId),
            gte(appointments.startsAt, dayStart),
            lt(appointments.startsAt, dayEnd)
          ),
        }),
        ctx.db.query.appointments.findMany({
          where: and(
            eq(appointments.organizationId, input.organizationId),
            gte(appointments.startsAt, now),
            inArray(appointments.status, ["pending", "confirmed"])
          ),
          orderBy: (a, { asc }) => [asc(a.startsAt)],
          limit: 8,
        }),
        ctx.db.$count(customers, eq(customers.organizationId, input.organizationId)),
        ctx.db
          .select({ total: sql<string>`coalesce(sum(${appointments.priceFils}), 0)` })
          .from(appointments)
          .where(
            and(
              eq(appointments.organizationId, input.organizationId),
              eq(appointments.status, "completed")
            )
          ),
      ]);

      const all = [...todayApts, ...upcomingApts];
      const serviceIds = [...new Set(all.map((a) => a.serviceId))];
      const staffIds = [...new Set(all.map((a) => a.staffId))];
      const customerIds = [...new Set(all.map((a) => a.customerId))];

      const [svcs, staffs, custs] = await Promise.all([
        serviceIds.length ? ctx.db.query.services.findMany({ where: inArray(services.id, serviceIds) }) : [],
        staffIds.length ? ctx.db.query.staffProfiles.findMany({ where: inArray(staffProfiles.id, staffIds) }) : [],
        customerIds.length ? ctx.db.query.customers.findMany({ where: inArray(customers.id, customerIds) }) : [],
      ]);

      const svcMap = new Map(svcs.map((s) => [s.id, s.name]));
      const staffMap = new Map(staffs.map((s) => [s.id, s.name]));
      const custMap = new Map(custs.map((c) => [c.id, c.name]));

      const shape = (a: typeof appointments.$inferSelect) => ({
        id: a.id,
        startsAtISO: a.startsAt.toISOString(),
        whenLocal: format(toZonedTime(a.startsAt, tz), "EEE, MMM d · HH:mm"),
        status: a.status,
        serviceName: svcMap.get(a.serviceId) ?? "—",
        staffName: staffMap.get(a.staffId) ?? "—",
        customerName: custMap.get(a.customerId) ?? "—",
      });

      return {
        timezone: tz,
        role: membership.role,
        todayCount: todayApts.length,
        customerCount,
        completedRevenueFils: Number(revenueRows[0]?.total ?? 0),
        upcoming: upcomingApts.map(shape),
      };
    }),

  listAppointments: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.string().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const conditions = [eq(appointments.organizationId, input.organizationId)];
      if (input.status) conditions.push(eq(appointments.status, input.status));
      if (input.date) {
        const dayStart = fromZonedTime(`${input.date}T00:00:00`, tz);
        const dayEnd = fromZonedTime(`${input.date}T23:59:59`, tz);
        conditions.push(gte(appointments.startsAt, dayStart), lt(appointments.startsAt, dayEnd));
      }

      const rows = await ctx.db.query.appointments.findMany({
        where: and(...conditions),
        orderBy: (a, { desc }) => [desc(a.startsAt)],
        limit: 100,
      });

      const serviceIds = [...new Set(rows.map((a) => a.serviceId))];
      const staffIds = [...new Set(rows.map((a) => a.staffId))];
      const customerIds = [...new Set(rows.map((a) => a.customerId))];
      const [svcs, staffs, custs] = await Promise.all([
        serviceIds.length ? ctx.db.query.services.findMany({ where: inArray(services.id, serviceIds) }) : [],
        staffIds.length ? ctx.db.query.staffProfiles.findMany({ where: inArray(staffProfiles.id, staffIds) }) : [],
        customerIds.length ? ctx.db.query.customers.findMany({ where: inArray(customers.id, customerIds) }) : [],
      ]);
      const svcMap = new Map(svcs.map((s) => [s.id, s.name]));
      const staffMap = new Map(staffs.map((s) => [s.id, s.name]));
      const custMap = new Map(custs.map((c) => [c.id, c.name]));

      const shaped = rows.map((a) => ({
        id: a.id,
        startsAtISO: a.startsAt.toISOString(),
        whenLocal: format(toZonedTime(a.startsAt, tz), "EEE, MMM d · HH:mm"),
        status: a.status,
        priceFils: a.priceFils,
        serviceName: svcMap.get(a.serviceId) ?? "—",
        staffName: staffMap.get(a.staffId) ?? "—",
        customerName: custMap.get(a.customerId) ?? "—",
      }));

      if (input.search) {
        const q = input.search.toLowerCase();
        return shaped.filter(
          (r) =>
            r.customerName.toLowerCase().includes(q) ||
            r.serviceName.toLowerCase().includes(q) ||
            r.staffName.toLowerCase().includes(q)
        );
      }
      return shaped;
    }),

  getAppointmentDetail: protectedProcedure
    .input(z.object({ organizationId: z.string(), appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const apt = await ctx.db.query.appointments.findFirst({
        where: and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.organizationId, input.organizationId)
        ),
      });
      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });

      const [service, staff, customer, history] = await Promise.all([
        ctx.db.query.services.findFirst({ where: eq(services.id, apt.serviceId) }),
        ctx.db.query.staffProfiles.findFirst({ where: eq(staffProfiles.id, apt.staffId) }),
        ctx.db.query.customers.findFirst({ where: eq(customers.id, apt.customerId) }),
        ctx.db.query.appointmentStatusHistory.findMany({
          where: eq(appointmentStatusHistory.appointmentId, apt.id),
          orderBy: (h, { asc }) => [asc(h.createdAt)],
        }),
      ]);

      return {
        id: apt.id,
        status: apt.status,
        startsAtISO: apt.startsAt.toISOString(),
        endsAtISO: apt.endsAt.toISOString(),
        whenLocal: format(toZonedTime(apt.startsAt, tz), "EEE, MMM d yyyy · HH:mm"),
        priceFils: apt.priceFils,
        depositFils: apt.depositFils,
        paymentStatus: apt.paymentStatus,
        customerNotes: apt.customerNotes,
        cancellationReason: apt.cancellationReason,
        serviceName: service?.name ?? "—",
        staffName: staff?.name ?? "—",
        customerName: customer?.name ?? "—",
        customerEmail: customer?.email ?? null,
        customerPhone: customer?.phone ?? null,
        timezone: tz,
        history: history.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedBy: h.changedBy,
          reason: h.reason,
          atLocal: format(toZonedTime(h.createdAt, tz), "MMM d · HH:mm"),
        })),
      };
    }),

  updateAppointmentStatus: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        appointmentId: z.string(),
        newStatus: z.enum(["pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);

      const apt = await ctx.db.query.appointments.findFirst({
        where: eq(appointments.id, input.appointmentId),
      });
      if (!apt || apt.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      }
      if (!isValidTransition(apt.status, input.newStatus)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot move appointment from "${apt.status}" to "${input.newStatus}"`,
        });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(appointments)
          .set({
            status: input.newStatus,
            cancelledAt: input.newStatus === "cancelled" ? new Date() : apt.cancelledAt,
            cancellationReason: input.newStatus === "cancelled" ? input.reason ?? null : apt.cancellationReason,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, apt.id));

        await tx.insert(appointmentStatusHistory).values({
          id: nanoid(),
          appointmentId: apt.id,
          fromStatus: apt.status,
          toStatus: input.newStatus,
          changedBy: ctx.userId,
          reason: input.reason ?? null,
        });

        await emitNotification(tx, {
          organizationId: apt.organizationId,
          type: `status_${input.newStatus}`,
          recipientType: "customer",
          recipientId: apt.customerId,
          recipientEmail: null,
          subject: `Appointment ${input.newStatus.replace(/_/g, " ")}`,
          body: "Demo notification. No real delivery happened.",
          channel: "internal",
          relatedAppointmentId: apt.id,
        });

        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: `appointment.${input.newStatus}`,
          entityType: "appointment",
          entityId: apt.id,
          meta: { from: apt.status, reason: input.reason ?? null },
        });
      });

      return { status: input.newStatus };
    }),

  getCalendarAppointments: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        days: z.number().int().min(1).max(14),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const dayDates: string[] = [];
      const base = fromZonedTime(`${input.startDate}T12:00:00`, tz);
      for (let i = 0; i < input.days; i++) {
        dayDates.push(format(addDays(base, i), "yyyy-MM-dd"));
      }
      const rangeStart = fromZonedTime(`${dayDates[0]}T00:00:00`, tz);
      const rangeEnd = fromZonedTime(`${dayDates[dayDates.length - 1]}T23:59:59`, tz);

      const rows = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.organizationId, input.organizationId),
          gte(appointments.startsAt, rangeStart),
          lt(appointments.startsAt, rangeEnd)
        ),
        orderBy: (a, { asc }) => [asc(a.startsAt)],
      });

      const serviceIds = [...new Set(rows.map((a) => a.serviceId))];
      const staffIds = [...new Set(rows.map((a) => a.staffId))];
      const customerIds = [...new Set(rows.map((a) => a.customerId))];
      const [svcs, staffs, custs] = await Promise.all([
        serviceIds.length ? ctx.db.query.services.findMany({ where: inArray(services.id, serviceIds) }) : [],
        staffIds.length ? ctx.db.query.staffProfiles.findMany({ where: inArray(staffProfiles.id, staffIds) }) : [],
        customerIds.length ? ctx.db.query.customers.findMany({ where: inArray(customers.id, customerIds) }) : [],
      ]);
      const svcMap = new Map(svcs.map((s) => [s.id, s.name]));
      const staffMap = new Map(staffs.map((s) => [s.id, s.name]));
      const custMap = new Map(custs.map((c) => [c.id, c.name]));

      const days = dayDates.map((date) => ({
        date,
        items: rows
          .filter((a) => format(toZonedTime(a.startsAt, tz), "yyyy-MM-dd") === date)
          .map((a) => ({
            id: a.id,
            status: a.status,
            localTime: format(toZonedTime(a.startsAt, tz), "HH:mm"),
            localHour: Number(format(toZonedTime(a.startsAt, tz), "H")),
            serviceName: svcMap.get(a.serviceId) ?? "—",
            staffName: staffMap.get(a.staffId) ?? "—",
            customerName: custMap.get(a.customerId) ?? "—",
          })),
      }));

      return { timezone: tz, days };
    }),
});
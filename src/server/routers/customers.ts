// src/server/routers/customers.ts
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { protectedProcedure, requireOrgMembership, router } from "../trpc";
import { organizations } from "@/db/schema/organizations";
import { customers } from "@/db/schema/customers";
import { appointments } from "@/db/schema/appointments";
import { services } from "@/db/schema/services";
import { staffProfiles } from "@/db/schema/staff";

export const customersRouter = router({
  listCustomers: protectedProcedure
    .input(z.object({ organizationId: z.string(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);

      const rows = await ctx.db.query.customers.findMany({
        where: eq(customers.organizationId, input.organizationId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: 200,
      });

      const shaped = rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalAppointments: c.totalAppointments,
        completedAppointments: c.completedAppointments,
        cancelledAppointments: c.cancelledAppointments,
        noShowCount: c.noShowCount,
        totalSpentFils: c.totalSpentFils,
        lastAppointmentAt: c.lastAppointmentAt ? c.lastAppointmentAt.toISOString() : null,
        consentGiven: c.consentGiven,
      }));

      if (input.search) {
        const q = input.search.toLowerCase();
        return shaped.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.email ?? "").toLowerCase().includes(q) ||
            (r.phone ?? "").includes(q)
        );
      }
      return shaped;
    }),

  getCustomerDetail: protectedProcedure
    .input(z.object({ organizationId: z.string(), customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);

      const cust = await ctx.db.query.customers.findFirst({
        where: and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId)),
      });
      if (!cust) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const apts = await ctx.db.query.appointments.findMany({
        where: eq(appointments.customerId, input.customerId),
        orderBy: (a, { desc }) => [desc(a.startsAt)],
        limit: 50,
      });

      const svcIds = [...new Set(apts.map((a) => a.serviceId))];
      const staffIds = [...new Set(apts.map((a) => a.staffId))];
      const [svcs, staffs] = await Promise.all([
        svcIds.length ? ctx.db.query.services.findMany({ where: inArray(services.id, svcIds) }) : [],
        staffIds.length ? ctx.db.query.staffProfiles.findMany({ where: inArray(staffProfiles.id, staffIds) }) : [],
      ]);
      const svcMap = new Map(svcs.map((s) => [s.id, s.name]));
      const staffMap = new Map(staffs.map((s) => [s.id, s.name]));

      return {
        customer: {
          id: cust.id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          notes: cust.notes,
          consentGiven: cust.consentGiven,
          totalAppointments: cust.totalAppointments,
          completedAppointments: cust.completedAppointments,
          cancelledAppointments: cust.cancelledAppointments,
          noShowCount: cust.noShowCount,
          totalSpentFils: cust.totalSpentFils,
        },
        history: apts.map((a) => ({
          id: a.id,
          status: a.status,
          whenLocal: format(toZonedTime(a.startsAt, tz), "EEE, MMM d yyyy · HH:mm"),
          serviceName: svcMap.get(a.serviceId) ?? "—",
          staffName: staffMap.get(a.staffId) ?? "—",
          priceFils: a.priceFils,
        })),
      };
    }),
});
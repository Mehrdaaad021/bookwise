// src/server/routers/reports.ts
import { z } from "zod";
import { and, eq, gte, inArray } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { protectedProcedure, requireOrgMembership, router } from "../trpc";
import { organizations } from "@/db/schema/organizations";
import { appointments } from "@/db/schema/appointments";
import { customers } from "@/db/schema/customers";
import { services } from "@/db/schema/services";
import { staffProfiles } from "@/db/schema/staff";

export const reportsRouter = router({
  getReports: protectedProcedure
    .input(z.object({ organizationId: z.string(), rangeDays: z.number().int().min(7).max(90) }))
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const now = new Date();
      const startDate = format(subDays(toZonedTime(now, tz), input.rangeDays - 1), "yyyy-MM-dd");
      const rangeStart = fromZonedTime(`${startDate}T00:00:00`, tz);

      const [apts, newCustomerCount] = await Promise.all([
        ctx.db.query.appointments.findMany({
          where: and(
            eq(appointments.organizationId, input.organizationId),
            gte(appointments.startsAt, rangeStart)
          ),
        }),
        ctx.db.$count(
          customers,
          and(eq(customers.organizationId, input.organizationId), gte(customers.createdAt, rangeStart))
        ),
      ]);

      const svcIds = [...new Set(apts.map((a) => a.serviceId))];
      const staffIds = [...new Set(apts.map((a) => a.staffId))];
      const [svcs, staffs] = await Promise.all([
        svcIds.length ? ctx.db.query.services.findMany({ where: inArray(services.id, svcIds) }) : [],
        staffIds.length ? ctx.db.query.staffProfiles.findMany({ where: inArray(staffProfiles.id, staffIds) }) : [],
      ]);
      const svcName = new Map(svcs.map((s) => [s.id, s.name]));
      const staffName = new Map(staffs.map((s) => [s.id, s.name]));

      const revenueByDayMap = new Map<string, { revenueFils: number; count: number }>();
      for (let i = 0; i < input.rangeDays; i++) {
        const d = format(subDays(toZonedTime(now, tz), input.rangeDays - 1 - i), "yyyy-MM-dd");
        revenueByDayMap.set(d, { revenueFils: 0, count: 0 });
      }

      const statusCounts: Record<string, number> = {};
      const serviceAgg = new Map<string, { count: number; revenueFils: number }>();
      const staffAgg = new Map<string, { count: number; minutes: number }>();
      let completedRevenue = 0;

      for (const a of apts) {
        const day = format(toZonedTime(a.startsAt, tz), "yyyy-MM-dd");
        const bucket = revenueByDayMap.get(day);
        statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;

        if (a.status === "completed") {
          completedRevenue += a.priceFils;
          if (bucket) bucket.revenueFils += a.priceFils;
        }
        if (bucket && a.status !== "cancelled") bucket.count += 1;

        const s = serviceAgg.get(a.serviceId) ?? { count: 0, revenueFils: 0 };
        s.count += 1;
        if (a.status === "completed") s.revenueFils += a.priceFils;
        serviceAgg.set(a.serviceId, s);

        const st = staffAgg.get(a.staffId) ?? { count: 0, minutes: 0 };
        st.count += 1;
        st.minutes += Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000);
        staffAgg.set(a.staffId, st);
      }

      const total = apts.length;

      return {
        timezone: tz,
        rangeDays: input.rangeDays,
        totals: {
          appointments: total,
          completedRevenueFils: completedRevenue,
          newCustomers: newCustomerCount,
          cancellationRate: total ? (statusCounts["cancelled"] ?? 0) / total : 0,
          noShowRate: total ? (statusCounts["no_show"] ?? 0) / total : 0,
        },
        revenueByDay: [...revenueByDayMap.entries()].map(([date, v]) => ({ date, ...v })),
        statusCounts,
        topServices: [...serviceAgg.entries()]
          .map(([id, v]) => ({ name: svcName.get(id) ?? "—", ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        staffLoad: [...staffAgg.entries()]
          .map(([id, v]) => ({ name: staffName.get(id) ?? "—", ...v }))
          .sort((a, b) => b.count - a.count),
      };
    }),
});
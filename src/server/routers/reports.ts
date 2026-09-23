// src/server/routers/reports.ts
import { z } from "zod";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { assertRole, protectedProcedure, requireOrgMembership, router } from "../trpc";
import { organizations } from "@/db/schema/organizations";
import { appointments } from "@/db/schema/appointments";
import { customers } from "@/db/schema/customers";
import { services } from "@/db/schema/services";
import { staffProfiles } from "@/db/schema/staff";

type AppointmentLite = { status: string; priceFils: number };

/**
 * مجموع‌های یک بازه رو محاسبه می‌کنه.
 * برای دوره فعلی و دوره قبلی با همین تابع استفاده میشه تا مقایسه عادلانه باشه.
 */
function computeTotals(apts: AppointmentLite[]) {
  let completedRevenueFils = 0;
  const statusCounts: Record<string, number> = {};
  for (const a of apts) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    if (a.status === "completed") completedRevenueFils += a.priceFils;
  }
  const total = apts.length;
  return {
    appointments: total,
    completedRevenueFils,
    cancellationRate: total ? (statusCounts["cancelled"] ?? 0) / total : 0,
    noShowRate: total ? (statusCounts["no_show"] ?? 0) / total : 0,
    statusCounts,
  };
}

export const reportsRouter = router({
  getReports: protectedProcedure
    .input(z.object({ organizationId: z.string(), rangeDays: z.number().int().min(7).max(90) }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]); // 🔒 financial data is admin-only

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const now = new Date();
      const todayZoned = toZonedTime(now, tz);

      // دوره فعلی: [امروز - (rangeDays-1) .. امروز]
      const startDate = format(subDays(todayZoned, input.rangeDays - 1), "yyyy-MM-dd");
      const rangeStart = fromZonedTime(`${startDate}T00:00:00`, tz);

      // دوره قبلی: بلافاصله قبل از دوره فعلی، به همون طول
      const prevStartDate = format(subDays(todayZoned, input.rangeDays * 2 - 1), "yyyy-MM-dd");
      const prevStart = fromZonedTime(`${prevStartDate}T00:00:00`, tz);

      const [aptsAll, newCustomerCount, prevNewCustomerCount] = await Promise.all([
        ctx.db.query.appointments.findMany({
          where: and(
            eq(appointments.organizationId, input.organizationId),
            gte(appointments.startsAt, prevStart)
          ),
        }),
        ctx.db.$count(
          customers,
          and(eq(customers.organizationId, input.organizationId), gte(customers.createdAt, rangeStart))
        ),
        ctx.db.$count(
          customers,
          and(
            eq(customers.organizationId, input.organizationId),
            gte(customers.createdAt, prevStart),
            lt(customers.createdAt, rangeStart)
          )
        ),
      ]);

      // تقسیم به دوره فعلی و قبلی
      const apts = aptsAll.filter((a) => a.startsAt >= rangeStart);
      const prevApts = aptsAll.filter((a) => a.startsAt < rangeStart);

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
        const d = format(subDays(todayZoned, input.rangeDays - 1 - i), "yyyy-MM-dd");
        revenueByDayMap.set(d, { revenueFils: 0, count: 0 });
      }

      const serviceAgg = new Map<string, { count: number; revenueFils: number }>();
      const staffAgg = new Map<string, { count: number; minutes: number }>();

      for (const a of apts) {
        const day = format(toZonedTime(a.startsAt, tz), "yyyy-MM-dd");
        const bucket = revenueByDayMap.get(day);
        if (a.status === "completed" && bucket) bucket.revenueFils += a.priceFils;
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

      const totals = computeTotals(apts);
      const previousTotals = computeTotals(prevApts);

      return {
        timezone: tz,
        rangeDays: input.rangeDays,
        totals: {
          appointments: totals.appointments,
          completedRevenueFils: totals.completedRevenueFils,
          newCustomers: newCustomerCount,
          cancellationRate: totals.cancellationRate,
          noShowRate: totals.noShowRate,
        },
        previous: {
          totals: {
            appointments: previousTotals.appointments,
            completedRevenueFils: previousTotals.completedRevenueFils,
            newCustomers: prevNewCustomerCount,
            cancellationRate: previousTotals.cancellationRate,
            noShowRate: previousTotals.noShowRate,
          },
        },
        revenueByDay: [...revenueByDayMap.entries()].map(([date, v]) => ({ date, ...v })),
        statusCounts: totals.statusCounts,
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
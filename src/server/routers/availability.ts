// src/server/routers/availability.ts
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { nanoid } from "nanoid";
import { assertRole, protectedProcedure, requireOrgMembership, router } from "../trpc";
import { recordAudit } from "../audit";
import { organizations } from "@/db/schema/organizations";
import { businessHours, businessHolidays, breakPeriods, staffTimeOff } from "@/db/schema/availability";
import { staffProfiles } from "@/db/schema/staff";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export const availabilityRouter = router({
  getAvailabilitySettings: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]); // 🔒 read is admin-only

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const staff = await ctx.db.query.staffProfiles.findMany({
        where: eq(staffProfiles.organizationId, input.organizationId),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });
      const staffIds = staff.map((s) => s.id);

      const [hours, holidays, timeOff, breaks] = await Promise.all([
        ctx.db.query.businessHours.findMany({ where: eq(businessHours.organizationId, input.organizationId) }),
        ctx.db.query.businessHolidays.findMany({ where: eq(businessHolidays.organizationId, input.organizationId) }),
        staffIds.length ? ctx.db.query.staffTimeOff.findMany({ where: inArray(staffTimeOff.staffId, staffIds) }) : [],
        staffIds.length ? ctx.db.query.breakPeriods.findMany({ where: inArray(breakPeriods.staffId, staffIds) }) : [],
      ]);

      const staffName = new Map(staff.map((s) => [s.id, s.name]));

      return {
        businessHours: Array.from({ length: 7 }, (_, day) => {
          const row = hours.find((h) => h.dayOfWeek === day);
          return {
            dayOfWeek: day,
            isOpen: row?.isOpen ?? false,
            openTime: row?.openTime ?? "09:00",
            closeTime: row?.closeTime ?? "18:00",
          };
        }),
        holidays: holidays
          .map((h) => ({ id: h.id, date: h.date, name: h.name, isRecurring: h.isRecurring }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        timeOff: timeOff.map((t) => ({
          id: t.id,
          staffId: t.staffId,
          staffName: staffName.get(t.staffId) ?? "—",
          startDate: format(toZonedTime(t.startDate, tz), "yyyy-MM-dd"),
          endDate: format(toZonedTime(t.endDate, tz), "yyyy-MM-dd"),
          reason: t.reason,
        })),
        breaks: breaks.map((b) => ({
          id: b.id,
          staffId: b.staffId,
          staffName: staffName.get(b.staffId) ?? "—",
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
          label: b.label,
        })),
        staffOptions: staff.map((s) => ({ id: s.id, name: s.name })),
      };
    }),

  upsertBusinessHours: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        dayOfWeek: z.number().int().min(0).max(6),
        isOpen: z.boolean(),
        openTime: z.string().regex(timeRegex),
        closeTime: z.string().regex(timeRegex),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      if (input.isOpen && timeToMin(input.openTime) >= timeToMin(input.closeTime)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Close time must be after open time" });
      }
      const existing = await ctx.db.query.businessHours.findFirst({
        where: and(
          eq(businessHours.organizationId, input.organizationId),
          eq(businessHours.dayOfWeek, input.dayOfWeek)
        ),
      });

      await ctx.db.transaction(async (tx) => {
        if (existing) {
          await tx
            .update(businessHours)
            .set({ isOpen: input.isOpen, openTime: input.openTime, closeTime: input.closeTime })
            .where(eq(businessHours.id, existing.id));
        } else {
          await tx.insert(businessHours).values({
            id: nanoid(),
            organizationId: input.organizationId,
            dayOfWeek: input.dayOfWeek,
            isOpen: input.isOpen,
            openTime: input.openTime,
            closeTime: input.closeTime,
          });
        }
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.hours_updated",
          entityType: "business_hours",
          entityId: existing?.id ?? null,
          meta: { dayOfWeek: input.dayOfWeek, isOpen: input.isOpen, openTime: input.openTime, closeTime: input.closeTime },
        });
      });

      return { ok: true as const };
    }),

  addHoliday: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        date: z.string().regex(dateRegex),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      const id = nanoid();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(businessHolidays).values({
          id,
          organizationId: input.organizationId,
          date: input.date,
          name: input.name,
          isRecurring: false,
        });
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.holiday_added",
          entityType: "business_holiday",
          entityId: id,
          meta: { date: input.date, name: input.name },
        });
      });
      return { ok: true as const };
    }),

  deleteHoliday: protectedProcedure
    .input(z.object({ organizationId: z.string(), holidayId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      await ctx.db.transaction(async (tx) => {
        await tx.delete(businessHolidays).where(eq(businessHolidays.id, input.holidayId));
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.holiday_deleted",
          entityType: "business_holiday",
          entityId: input.holidayId,
        });
      });
      return { ok: true as const };
    }),

  addTimeOff: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        staffId: z.string(),
        startDate: z.string().regex(dateRegex),
        endDate: z.string().regex(dateRegex),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      if (input.endDate < input.startDate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be on or after start date" });
      }
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";
      const id = nanoid();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(staffTimeOff).values({
          id,
          staffId: input.staffId,
          startDate: fromZonedTime(`${input.startDate}T00:00:00`, tz),
          endDate: fromZonedTime(`${input.endDate}T23:59:00`, tz),
          reason: input.reason ?? null,
        });
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.timeoff_added",
          entityType: "staff_time_off",
          entityId: id,
          meta: { staffId: input.staffId, startDate: input.startDate, endDate: input.endDate },
        });
      });
      return { ok: true as const };
    }),

  deleteTimeOff: protectedProcedure
    .input(z.object({ organizationId: z.string(), timeOffId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      await ctx.db.transaction(async (tx) => {
        await tx.delete(staffTimeOff).where(eq(staffTimeOff.id, input.timeOffId));
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.timeoff_deleted",
          entityType: "staff_time_off",
          entityId: input.timeOffId,
        });
      });
      return { ok: true as const };
    }),

  addBreak: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        staffId: z.string(),
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(timeRegex),
        endTime: z.string().regex(timeRegex),
        label: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      if (timeToMin(input.startTime) >= timeToMin(input.endTime)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time" });
      }
      const id = nanoid();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(breakPeriods).values({
          id,
          staffId: input.staffId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          label: input.label ?? null,
        });
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.break_added",
          entityType: "break_period",
          entityId: id,
          meta: { staffId: input.staffId, dayOfWeek: input.dayOfWeek, startTime: input.startTime, endTime: input.endTime },
        });
      });
      return { ok: true as const };
    }),

  deleteBreak: protectedProcedure
    .input(z.object({ organizationId: z.string(), breakId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);
      await ctx.db.transaction(async (tx) => {
        await tx.delete(breakPeriods).where(eq(breakPeriods.id, input.breakId));
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "availability.break_deleted",
          entityType: "break_period",
          entityId: input.breakId,
        });
      });
      return { ok: true as const };
    }),
});
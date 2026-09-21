// src/server/scheduling-context.ts
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { businessHours, businessHolidays, staffHours, breakPeriods, staffTimeOff } from "@/db/schema/availability";
import { staffProfiles } from "@/db/schema/staff";
import { appointments } from "@/db/schema/appointments";
import type { Database } from "@/db";
import type {
  StaffAvailability,
  StaffDayHours,
  ExistingAppointment,
} from "@/lib/scheduling/availability";

export interface DayContext {
  dayOfWeek: number;
  businessHours: StaffDayHours | null;
  holidays: string[];
  staff: StaffAvailability[];
  appointments: ExistingAppointment[];
}

/**
 * Gathers everything the scheduling engine needs for one calendar day.
 * Works with both `db` and a transaction (`tx`) executor.
 */
export async function gatherDayContext(
  exe: Database,
  orgId: string,
  staffIds: string[],
  dateStr: string,
  tz: string
): Promise<DayContext> {
  const localNoon = toZonedTime(fromZonedTime(`${dateStr}T12:00:00`, tz), tz);
  const dayOfWeek = localNoon.getDay();

  const [bh, holiday, sHours, breaks, timeOff] = await Promise.all([
    exe.query.businessHours.findFirst({
      where: and(eq(businessHours.organizationId, orgId), eq(businessHours.dayOfWeek, dayOfWeek)),
    }),
    exe.query.businessHolidays.findFirst({
      where: and(eq(businessHolidays.organizationId, orgId), eq(businessHolidays.date, dateStr)),
    }),
    staffIds.length ? exe.query.staffHours.findMany({ where: inArray(staffHours.staffId, staffIds) }) : [],
    staffIds.length ? exe.query.breakPeriods.findMany({ where: inArray(breakPeriods.staffId, staffIds) }) : [],
    staffIds.length ? exe.query.staffTimeOff.findMany({ where: inArray(staffTimeOff.staffId, staffIds) }) : [],
  ]);

  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, tz);
  const dayEnd = fromZonedTime(`${dateStr}T23:59:59`, tz);

  const apts = staffIds.length
    ? await exe.query.appointments.findMany({
        where: and(
          inArray(appointments.staffId, staffIds),
          gte(appointments.startsAt, dayStart),
          lte(appointments.startsAt, dayEnd)
        ),
      })
    : [];

  const staffRows = staffIds.length
    ? await exe.query.staffProfiles.findMany({ where: inArray(staffProfiles.id, staffIds) })
    : [];

  const staff: StaffAvailability[] = staffRows.map((s) => {
    const h = sHours.find((x) => x.staffId === s.id && x.dayOfWeek === dayOfWeek);
    return {
      id: s.id,
      name: s.name,
      hours: h ? { openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen } : null,
      breaks: breaks
        .filter((b) => b.staffId === s.id && b.dayOfWeek === dayOfWeek)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
      timeOffPeriods: timeOff
        .filter((t) => t.staffId === s.id)
        .map((t) => ({ start: t.startDate, end: t.endDate })),
      maxDailyAppointments: s.maxDailyAppointments,
      dailyAppointmentCount: apts.filter((a) => a.staffId === s.id && a.status !== "cancelled").length,
    };
  });

  return {
    dayOfWeek,
    businessHours: bh ? { openTime: bh.openTime, closeTime: bh.closeTime, isOpen: bh.isOpen } : null,
    holidays: holiday ? [holiday.date] : [],
    staff,
    appointments: apts
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({ staffId: a.staffId, startsAt: a.startsAt, endsAt: a.endsAt, status: a.status })),
  };
}

/** Converts an ISO timestamp to a "yyyy-MM-dd" date string in the business timezone */
export function localDateStr(iso: string, tz: string): string {
  return format(toZonedTime(new Date(iso), tz), "yyyy-MM-dd");
}
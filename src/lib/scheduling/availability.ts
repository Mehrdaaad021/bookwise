// src/lib/scheduling/availability.ts
import { addMinutes, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export interface StaffDayHours {
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface TimeSlot {
  startISO: string;
  endISO: string;
  displayStart: string;
  displayEnd: string;
  staffId: string;
  staffName: string;
}

export interface StaffAvailability {
  id: string;
  name: string;
  hours: StaffDayHours | null;
  breaks: { startTime: string; endTime: string }[];
  timeOffPeriods: { start: Date; end: Date }[];
  maxDailyAppointments: number | null;
  dailyAppointmentCount: number;
}

export interface ExistingAppointment {
  staffId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
}

export interface AvailabilityInput {
  date: string; // "2025-07-15" in business timezone
  timezone: string; // IANA e.g. "Asia/Dubai"
  serviceDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  slotInterval: number;
  businessHours: StaffDayHours | null;
  temporarilyClosed?: boolean;
  staffMembers: StaffAvailability[];
  existingAppointments: ExistingAppointment[];
  holidays: string[];
  minimumNoticeMinutes: number;
  maxBookingDaysAhead: number;
  now: Date;
}

export interface AvailabilityResult {
  date: string;
  timezone: string;
  eligibleStaff: { id: string; name: string }[];
  slots: TimeSlot[];
  noAvailabilityReason?: string;
}

/**
 * Core overlap rule:
 * two intervals overlap when aStart < bEnd AND aEnd > bStart
 * Touching intervals (end === start) do NOT overlap.
 */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function generateAvailableSlots(input: AvailabilityInput): AvailabilityResult {
  const {
    date, timezone, serviceDuration, bufferBefore, bufferAfter, slotInterval,
    businessHours, staffMembers, existingAppointments, holidays,
    minimumNoticeMinutes, maxBookingDaysAhead, now,
  } = input;

  const closed = (reason: string): AvailabilityResult => ({
    date,
    timezone,
    eligibleStaff: staffMembers.map((s) => ({ id: s.id, name: s.name })),
    slots: [],
    noAvailabilityReason: reason,
  });

  if (input.temporarilyClosed) return closed("Business is temporarily closed");
  if (holidays.includes(date)) return closed("Business is closed on this day (holiday)");
  if (!businessHours?.isOpen) return closed("Business is closed on this day");

  // Booking window check (in business timezone, DST-safe)
  const localNoon = toZonedTime(fromZonedTime(`${date}T12:00:00`, timezone), timezone);
  const nowLocal = toZonedTime(now, timezone);
  const daysDiff = Math.floor(
    (startOfDay(localNoon).getTime() - startOfDay(nowLocal).getTime()) / 86400000
  );
  if (daysDiff < 0) return closed("Date is in the past");
  if (daysDiff > maxBookingDaysAhead) return closed("Booking window exceeded");

  const dayStartUTC = fromZonedTime(`${date}T00:00:00`, timezone);
  const dayEndUTC = fromZonedTime(`${date}T23:59:59`, timezone);

  const eligible = staffMembers.filter((s) => {
    if (s.hours && !s.hours.isOpen) return false;
    return !s.timeOffPeriods.some((t) => intervalsOverlap(t.start, t.end, dayStartUTC, dayEndUTC));
  });

  if (eligible.length === 0) {
    return { date, timezone, eligibleStaff: [], slots: [], noAvailabilityReason: "No available staff for this date" };
  }

  const totalDuration = bufferBefore + serviceDuration + bufferAfter;
  const earliestAllowed = addMinutes(now, minimumNoticeMinutes);
  const slots: TimeSlot[] = [];

  for (const staff of eligible) {
    const hours = staff.hours ?? businessHours;
    if (!hours.isOpen) continue;
    if (staff.maxDailyAppointments !== null && staff.dailyAppointmentCount >= staff.maxDailyAppointments) continue;

    const openMin = timeToMinutes(hours.openTime);
    const closeMin = timeToMinutes(hours.closeTime);

    for (let cursor = openMin; cursor + totalDuration <= closeMin; cursor += slotInterval) {
      const serviceStartMin = cursor + bufferBefore;
      const serviceEndMin = serviceStartMin + serviceDuration;

      const startUTC = fromZonedTime(`${date}T${minutesToTime(serviceStartMin)}:00`, timezone);
      const endUTC = fromZonedTime(`${date}T${minutesToTime(serviceEndMin)}:00`, timezone);

      // Minimum notice policy
      if (startUTC < earliestAllowed) continue;

      // Buffered block around the service
      const bufferedStart = new Date(startUTC.getTime() - bufferBefore * 60000);
      const bufferedEnd = new Date(endUTC.getTime() + bufferAfter * 60000);

      // Conflict with existing appointments (overlap rule)
      const conflict = existingAppointments.some(
        (a) =>
          a.staffId === staff.id &&
          a.status !== "cancelled" &&
          intervalsOverlap(a.startsAt, a.endsAt, bufferedStart, bufferedEnd)
      );
      if (conflict) continue;

      // Conflict with staff breaks
      const onBreak = staff.breaks.some((b) => {
        const bStart = fromZonedTime(`${date}T${b.startTime}:00`, timezone);
        const bEnd = fromZonedTime(`${date}T${b.endTime}:00`, timezone);
        return intervalsOverlap(bStart, bEnd, bufferedStart, bufferedEnd);
      });
      if (onBreak) continue;

      slots.push({
        startISO: startUTC.toISOString(),
        endISO: endUTC.toISOString(),
        displayStart: minutesToTime(serviceStartMin),
        displayEnd: minutesToTime(serviceEndMin),
        staffId: staff.id,
        staffName: staff.name,
      });
    }
  }

  slots.sort((a, b) => a.startISO.localeCompare(b.startISO));

  return {
    date,
    timezone,
    eligibleStaff: eligible.map((s) => ({ id: s.id, name: s.name })),
    slots,
    noAvailabilityReason: slots.length ? undefined : "No available time slots on this date",
  };
}

// ---------------------------------------------------------------------------
// Server-side re-validation used right before creating/rescheduling a booking
// ---------------------------------------------------------------------------

export interface SlotValidationInput {
  timezone: string;
  date: string;
  startsAt: Date;
  endsAt: Date;
  bufferBefore: number;
  bufferAfter: number;
  staff: StaffAvailability;
  businessHours: StaffDayHours | null;
  existingAppointments: ExistingAppointment[];
}

export type SlotValidationResult = { ok: true } | { ok: false; reason: string };

export function validateRequestedSlot(input: SlotValidationInput): SlotValidationResult {
  const { timezone, date, startsAt, endsAt, bufferBefore, bufferAfter, staff, businessHours } = input;

  const hours = staff.hours ?? businessHours;
  if (!hours || !hours.isOpen) return { ok: false, reason: "Staff is not working on this day" };

  const dayStartUTC = fromZonedTime(`${date}T00:00:00`, timezone);
  const dayEndUTC = fromZonedTime(`${date}T23:59:59`, timezone);
  if (staff.timeOffPeriods.some((t) => intervalsOverlap(t.start, t.end, dayStartUTC, dayEndUTC))) {
    return { ok: false, reason: "Staff is on time off" };
  }

  const bufferedStart = new Date(startsAt.getTime() - bufferBefore * 60000);
  const bufferedEnd = new Date(endsAt.getTime() + bufferAfter * 60000);

  const openUTC = fromZonedTime(`${date}T${hours.openTime}:00`, timezone);
  const closeUTC = fromZonedTime(`${date}T${hours.closeTime}:00`, timezone);
  if (bufferedStart < openUTC || bufferedEnd > closeUTC) {
    return { ok: false, reason: "Outside working hours" };
  }

  const onBreak = staff.breaks.some((b) => {
    const bStart = fromZonedTime(`${date}T${b.startTime}:00`, timezone);
    const bEnd = fromZonedTime(`${date}T${b.endTime}:00`, timezone);
    return intervalsOverlap(bStart, bEnd, bufferedStart, bufferedEnd);
  });
  if (onBreak) return { ok: false, reason: "Staff is on a break" };

  const conflict = input.existingAppointments.some(
    (a) =>
      a.staffId === staff.id &&
      a.status !== "cancelled" &&
      intervalsOverlap(a.startsAt, a.endsAt, bufferedStart, bufferedEnd)
  );
  if (conflict) return { ok: false, reason: "Time slot is no longer available" };

  return { ok: true };
}

// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
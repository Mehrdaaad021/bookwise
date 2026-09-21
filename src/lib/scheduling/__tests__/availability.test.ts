// src/lib/scheduling/__tests__/availability.test.ts
import { describe, expect, it } from "vitest";
import {
  generateAvailableSlots,
  intervalsOverlap,
  validateRequestedSlot,
  type AvailabilityInput,
  type StaffAvailability,
} from "../availability";

const D = (s: string) => new Date(s);

function makeStaff(over: Partial<StaffAvailability> = {}): StaffAvailability {
  return {
    id: "staff-1",
    name: "Sara",
    hours: null,
    breaks: [],
    timeOffPeriods: [],
    maxDailyAppointments: null,
    dailyAppointmentCount: 0,
    ...over,
  };
}

function baseInput(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    date: "2025-07-15",
    timezone: "Asia/Dubai",
    serviceDuration: 60,
    bufferBefore: 0,
    bufferAfter: 0,
    slotInterval: 30,
    businessHours: { openTime: "09:00", closeTime: "18:00", isOpen: true },
    staffMembers: [makeStaff()],
    existingAppointments: [],
    holidays: [],
    minimumNoticeMinutes: 0,
    maxBookingDaysAhead: 30,
    now: D("2025-07-14T00:00:00Z"),
    ...over,
  };
}

describe("intervalsOverlap", () => {
  it("detects overlapping intervals", () => {
    expect(intervalsOverlap(D("2025-07-15T09:00:00Z"), D("2025-07-15T10:00:00Z"), D("2025-07-15T09:30:00Z"), D("2025-07-15T10:30:00Z"))).toBe(true);
  });
  it("does not treat touching intervals as overlapping", () => {
    expect(intervalsOverlap(D("2025-07-15T09:00:00Z"), D("2025-07-15T10:00:00Z"), D("2025-07-15T10:00:00Z"), D("2025-07-15T11:00:00Z"))).toBe(false);
  });
  it("detects contained intervals", () => {
    expect(intervalsOverlap(D("2025-07-15T09:00:00Z"), D("2025-07-15T12:00:00Z"), D("2025-07-15T10:00:00Z"), D("2025-07-15T11:00:00Z"))).toBe(true);
  });
});

describe("generateAvailableSlots", () => {
  it("generates slots within business hours", () => {
    const r = generateAvailableSlots(baseInput());
    expect(r.slots.length).toBeGreaterThan(0);
    expect(r.slots[0].displayStart).toBe("09:00");
    expect(r.slots[r.slots.length - 1].displayStart).toBe("17:00");
  });

  it("respects service duration", () => {
    const r = generateAvailableSlots(baseInput({ serviceDuration: 90 }));
    expect(r.slots[0].displayEnd).toBe("10:30");
  });

  it("applies buffer time", () => {
    const r = generateAvailableSlots(baseInput({ bufferBefore: 15, bufferAfter: 15 }));
    expect(r.slots[0].displayStart).toBe("09:15");
    expect(r.slots[r.slots.length - 1].displayEnd).toBe("17:45");
  });

  it("blocks conflicting appointments (overlap rule)", () => {
    const r = generateAvailableSlots(baseInput({
      existingAppointments: [{ staffId: "staff-1", startsAt: D("2025-07-15T06:00:00Z"), endsAt: D("2025-07-15T07:00:00Z"), status: "confirmed" }],
    }));
    const starts = r.slots.map((s) => s.displayStart);
    expect(starts).not.toContain("10:00");
    expect(starts).not.toContain("09:30");
    expect(starts).toContain("09:00");
  });

  it("allows back-to-back appointments", () => {
    const r = generateAvailableSlots(baseInput({
      existingAppointments: [{ staffId: "staff-1", startsAt: D("2025-07-15T06:00:00Z"), endsAt: D("2025-07-15T07:00:00Z"), status: "confirmed" }],
    }));
    expect(r.slots.map((s) => s.displayStart)).toContain("11:00");
  });

  it("respects staff working hours", () => {
    const r = generateAvailableSlots(baseInput({
      staffMembers: [makeStaff({ hours: { openTime: "12:00", closeTime: "14:00", isOpen: true } })],
    }));
    expect(r.slots[0].displayStart).toBe("12:00");
    expect(r.slots[r.slots.length - 1].displayStart).toBe("13:00");
  });

  it("respects staff breaks", () => {
    const r = generateAvailableSlots(baseInput({
      staffMembers: [makeStaff({ breaks: [{ startTime: "12:00", endTime: "13:00" }] })],
    }));
    const starts = r.slots.map((s) => s.displayStart);
    expect(starts).not.toContain("11:30");
    expect(starts).not.toContain("12:00");
    expect(starts).toContain("13:00");
  });

  it("returns no slots on holiday", () => {
    const r = generateAvailableSlots(baseInput({ holidays: ["2025-07-15"] }));
    expect(r.slots).toHaveLength(0);
    expect(r.noAvailabilityReason).toMatch(/holiday/i);
  });

  it("returns no slots when business closed", () => {
    const r = generateAvailableSlots(baseInput({ businessHours: { openTime: "09:00", closeTime: "18:00", isOpen: false } }));
    expect(r.slots).toHaveLength(0);
  });

  it("respects staff time off", () => {
    const r = generateAvailableSlots(baseInput({
      staffMembers: [makeStaff({ timeOffPeriods: [{ start: D("2025-07-15T00:00:00Z"), end: D("2025-07-15T23:59:00Z") }] })],
    }));
    expect(r.slots).toHaveLength(0);
    expect(r.noAvailabilityReason).toMatch(/staff/i);
  });

  it("enforces minimum notice", () => {
    const r = generateAvailableSlots(baseInput({ now: D("2025-07-15T05:00:00Z"), minimumNoticeMinutes: 60 }));
    expect(r.slots[0].displayStart).toBe("10:00");
  });

  it("enforces max booking window", () => {
    const r = generateAvailableSlots(baseInput({ date: "2025-09-01", maxBookingDaysAhead: 30 }));
    expect(r.slots).toHaveLength(0);
    expect(r.noAvailabilityReason).toMatch(/window/i);
  });

  it("converts business timezone to UTC (Asia/Dubai = UTC+4)", () => {
    const r = generateAvailableSlots(baseInput());
    expect(r.slots[0].startISO).toBe("2025-07-15T05:00:00.000Z");
  });

  it("is daylight-saving safe (Europe/London summer = UTC+1)", () => {
    const r = generateAvailableSlots(baseInput({ timezone: "Europe/London" }));
    expect(r.slots[0].startISO).toBe("2025-07-15T08:00:00.000Z");
  });

  it("offers slots from multiple eligible staff", () => {
    const r = generateAvailableSlots(baseInput({ staffMembers: [makeStaff(), makeStaff({ id: "staff-2", name: "Layla" })] }));
    expect(new Set(r.slots.map((s) => s.staffId)).size).toBe(2);
  });

  it("returns empty when no staff", () => {
    const r = generateAvailableSlots(baseInput({ staffMembers: [] }));
    expect(r.slots).toHaveLength(0);
  });

  it("fully booked date yields no slots", () => {
    const r = generateAvailableSlots(baseInput({
      businessHours: { openTime: "09:00", closeTime: "10:00", isOpen: true },
      existingAppointments: [{ staffId: "staff-1", startsAt: D("2025-07-15T05:00:00Z"), endsAt: D("2025-07-15T06:00:00Z"), status: "confirmed" }],
    }));
    expect(r.slots).toHaveLength(0);
  });
});

describe("validateRequestedSlot", () => {
  const common = {
    timezone: "Asia/Dubai",
    date: "2025-07-15",
    bufferBefore: 0,
    bufferAfter: 0,
    staff: makeStaff(),
    businessHours: { openTime: "09:00", closeTime: "18:00", isOpen: true },
  };

  it("accepts a free slot", () => {
    const res = validateRequestedSlot({
      ...common,
      startsAt: D("2025-07-15T06:00:00Z"),
      endsAt: D("2025-07-15T07:00:00Z"),
      existingAppointments: [],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects overlapping appointment", () => {
    const res = validateRequestedSlot({
      ...common,
      startsAt: D("2025-07-15T06:00:00Z"),
      endsAt: D("2025-07-15T07:00:00Z"),
      existingAppointments: [{ staffId: "staff-1", startsAt: D("2025-07-15T06:30:00Z"), endsAt: D("2025-07-15T07:30:00Z"), status: "confirmed" }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects outside working hours", () => {
    const res = validateRequestedSlot({
      ...common,
      startsAt: D("2025-07-15T04:00:00Z"),
      endsAt: D("2025-07-15T05:00:00Z"),
      existingAppointments: [],
    });
    expect(res.ok).toBe(false);
  });
});
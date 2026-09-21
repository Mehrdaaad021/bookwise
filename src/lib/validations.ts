// src/lib/validations.ts
import { z } from "zod";

export const createServiceSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(255),
  categoryId: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  longDescription: z.string().optional(),
  durationMinutes: z.number().int().positive("Duration must be positive"),
  bufferBeforeMinutes: z.number().int().min(0).default(0),
  bufferAfterMinutes: z.number().int().min(0).default(0),
  priceFils: z.number().int().min(0, "Price cannot be negative"),
  depositFils: z.number().int().min(0).default(0),
  depositType: z.enum(["none", "fixed", "percentage"]).default("none"),
  taxRatePercent: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
  staffIds: z.array(z.string()).optional(),
});

export const createBookingSchema = z.object({
  organizationSlug: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  startsAt: z.string().datetime(),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5).max(30),
  customerNotes: z.string().max(1000).optional(),
  consentGiven: z.boolean().refine((v) => v === true, "You must agree to the booking policy"),
});

export const appointmentStatusSchema = z.object({
  appointmentId: z.string(),
  organizationId: z.string(),
  newStatus: z.enum([
    "pending",
    "confirmed",
    "checked_in",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ]),
  reason: z.string().optional(),
});

// ✅ جدول انتقال‌های مجاز وضعیت نوبت
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
import { pgTable, text, timestamp, varchar, integer, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export interface OrganizationSettings {
  slotInterval?: number;
  minimumNoticeMinutes?: number;
  maxBookingDaysAhead?: number;
  defaultCancellationWindowHours?: number;
  defaultBufferMinutes?: number;
  allowStaffSelection?: boolean;
  acceptOutsideHours?: boolean;
  isTemporarilyClosed?: boolean;
  taxRatePercent?: number;
}

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Dubai").notNull(),
  currency: varchar("currency", { length: 3 }).default("AED").notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("AE"),
  website: text("website"),
  isActive: boolean("is_active").default(true).notNull(),
  isDemo: boolean("is_demo").default(false).notNull(),
  settings: jsonb("settings").$type<OrganizationSettings>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_user_unique").on(table.organizationId, table.userId),
]);

export const bookingPolicies = pgTable("booking_policies", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").unique().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  cancellationWindowHours: integer("cancellation_window_hours").default(24).notNull(),
  rescheduleWindowHours: integer("reschedule_window_hours").default(24).notNull(),
  requireDeposit: boolean("require_deposit").default(false).notNull(),
  maxAppointmentsPerCustomer: integer("max_appointments_per_customer"),
  autoConfirmBookings: boolean("auto_confirm_bookings").default(true).notNull(),
  privacyNotice: text("privacy_notice"),
  bookingTerms: text("booking_terms"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
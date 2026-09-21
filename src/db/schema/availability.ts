import { pgTable, text, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { staffProfiles } from "./staff";

export const businessHours = pgTable("business_hours", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  isOpen: boolean("is_open").default(true).notNull(),
  openTime: varchar("open_time", { length: 5 }).notNull(),
  closeTime: varchar("close_time", { length: 5 }).notNull(),
});

export const staffHours = pgTable("staff_hours", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  isOpen: boolean("is_open").default(true).notNull(),
  openTime: varchar("open_time", { length: 5 }).notNull(),
  closeTime: varchar("close_time", { length: 5 }).notNull(),
});

export const breakPeriods = pgTable("break_periods", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  label: varchar("label", { length: 100 }),
});

export const businessHolidays = pgTable("business_holidays", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
});

export const staffTimeOff = pgTable("staff_time_off", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
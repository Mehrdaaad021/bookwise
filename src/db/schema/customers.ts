import { pgTable, text, timestamp, varchar, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  normalizedEmail: varchar("normalized_email", { length: 255 }),
  normalizedPhone: varchar("normalized_phone", { length: 30 }),
  notes: text("notes"),
  consentGiven: boolean("consent_given").default(false).notNull(),
  communicationPreference: varchar("communication_preference", { length: 20 }).default("email"),
  totalAppointments: integer("total_appointments").default(0).notNull(),
  completedAppointments: integer("completed_appointments").default(0).notNull(),
  cancelledAppointments: integer("cancelled_appointments").default(0).notNull(),
  noShowCount: integer("no_show_count").default(0).notNull(),
  totalSpentFils: integer("total_spent_fils").default(0).notNull(),
  lastAppointmentAt: timestamp("last_appointment_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_customer_email").on(table.organizationId, table.normalizedEmail),
  uniqueIndex("org_customer_phone").on(table.organizationId, table.normalizedPhone),
]);
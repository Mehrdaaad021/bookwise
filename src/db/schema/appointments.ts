import { pgTable, text, timestamp, varchar, integer, boolean, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { services } from "./services";
import { staffProfiles } from "./staff";
import { customers } from "./customers";

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id),
  staffId: text("staff_id").notNull().references(() => staffProfiles.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
  endsAt: timestamp("ends_at", { mode: "date" }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  priceFils: integer("price_fils").notNull(),
  depositFils: integer("deposit_fils").default(0).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("not_required"),
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  manageToken: varchar("manage_token", { length: 64 }).unique().notNull(),
  cancelledAt: timestamp("cancelled_at", { mode: "date" }),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("apt_org_starts").on(table.organizationId, table.startsAt),
  index("apt_staff_starts").on(table.staffId, table.startsAt),
  index("apt_customer").on(table.customerId),
  index("apt_status").on(table.organizationId, table.status),
  index("apt_manage_token").on(table.manageToken),
]);

export const appointmentStatusHistory = pgTable("appointment_status_history", {
  id: text("id").primaryKey(),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  fromStatus: varchar("from_status", { length: 20 }),
  toStatus: varchar("to_status", { length: 20 }).notNull(),
  changedBy: text("changed_by"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const appointmentNotes = pgTable("appointment_notes", {
  id: text("id").primaryKey(),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  authorId: text("author_id"),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
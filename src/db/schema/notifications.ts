import { pgTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const notificationEvents = pgTable("notification_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  recipientType: varchar("recipient_type", { length: 20 }).notNull(),
  recipientId: text("recipient_id"),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  recipientPhone: varchar("recipient_phone", { length: 30 }),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  channel: varchar("channel", { length: 20 }).default("internal"),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("stored"),
  relatedAppointmentId: text("related_appointment_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("notif_org").on(table.organizationId),
  index("notif_recipient").on(table.recipientType, table.recipientId),
]);
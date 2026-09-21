import { pgTable, text, timestamp, varchar, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { services } from "./services";

export const staffProfiles = pgTable("staff_profiles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  bio: text("bio"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  profileImageUrl: text("profile_image_url"),
  maxDailyAppointments: integer("max_daily_appointments"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_staff_slug").on(table.organizationId, table.slug),
]);

export const staffServices = pgTable("staff_services", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("staff_service_unique").on(table.staffId, table.serviceId),
]);
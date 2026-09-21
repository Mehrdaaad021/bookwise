import { pgTable, text, timestamp, varchar, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const serviceCategories = pgTable("service_categories", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => serviceCategories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  shortDescription: varchar("short_description", { length: 500 }),
  longDescription: text("long_description"),
  durationMinutes: integer("duration_minutes").notNull(),
  bufferBeforeMinutes: integer("buffer_before_minutes").default(0).notNull(),
  bufferAfterMinutes: integer("buffer_after_minutes").default(0).notNull(),
  priceFils: integer("price_fils").notNull(),
  depositFils: integer("deposit_fils").default(0).notNull(),
  depositType: varchar("deposit_type", { length: 20 }).default("none"),
  taxRatePercent: integer("tax_rate_percent").default(0).notNull(),
  imageUrl: text("image_url"),
  icon: varchar("icon", { length: 50 }),
  bookingInstructions: text("booking_instructions"),
  cancellationPolicyOverride: text("cancellation_policy_override"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_service_slug").on(table.organizationId, table.slug),
]);
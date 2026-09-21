// src/server/routers/staff.ts
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { assertRole, protectedProcedure, requireOrgMembership, router } from "../trpc";
import { recordAudit } from "../audit";
import { staffProfiles, staffServices } from "@/db/schema/staff";
import { services } from "@/db/schema/services";

export const staffRouter = router({
  listAdminStaff: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]); // 🔒 read is admin-only

      const rows = await ctx.db.query.staffProfiles.findMany({
        where: eq(staffProfiles.organizationId, input.organizationId),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });

      const ids = rows.map((r) => r.id);
      const links = ids.length
        ? await ctx.db.query.staffServices.findMany({ where: inArray(staffServices.staffId, ids) })
        : [];
      const svcRows = links.length
        ? await ctx.db.query.services.findMany({ where: eq(services.organizationId, input.organizationId) })
        : [];
      const svcMap = new Map(svcRows.map((s) => [s.id, s.name]));

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        bio: r.bio,
        email: r.email,
        phone: r.phone,
        isActive: r.isActive,
        services: links
          .filter((l) => l.staffId === r.id)
          .map((l) => ({ id: l.serviceId, name: svcMap.get(l.serviceId) ?? "—" })),
      }));
    }),

  listServiceOptions: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]); // 🔒 read is admin-only

      const rows = await ctx.db.query.services.findMany({
        where: and(eq(services.organizationId, input.organizationId), eq(services.isArchived, false)),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });
      return rows.map((s) => ({ id: s.id, name: s.name }));
    }),

  createStaff: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(255),
        role: z.string().max(100).optional(),
        bio: z.string().max(1000).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(30).optional(),
        serviceIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);

      const id = nanoid();
      const slug =
        input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nanoid(6);

      await ctx.db.transaction(async (tx) => {
        await tx.insert(staffProfiles).values({
          id,
          organizationId: input.organizationId,
          name: input.name,
          slug,
          role: input.role ?? null,
          bio: input.bio ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
        });
        if (input.serviceIds?.length) {
          await tx
            .insert(staffServices)
            .values(input.serviceIds.map((sid) => ({ id: nanoid(), staffId: id, serviceId: sid })));
        }
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "staff.created",
          entityType: "staff",
          entityId: id,
          meta: { name: input.name, role: input.role ?? null },
        });
      });

      return { id };
    }),

  updateStaff: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        staffId: z.string(),
        isActive: z.boolean().optional(),
        name: z.string().min(1).max(255).optional(),
        role: z.string().max(100).optional(),
        serviceIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);

      const row = await ctx.db.query.staffProfiles.findFirst({
        where: and(eq(staffProfiles.id, input.staffId), eq(staffProfiles.organizationId, input.organizationId)),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Staff not found" });

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(staffProfiles)
          .set({
            isActive: input.isActive ?? row.isActive,
            name: input.name ?? row.name,
            role: input.role ?? row.role,
            updatedAt: new Date(),
          })
          .where(eq(staffProfiles.id, row.id));

        if (input.serviceIds) {
          await tx.delete(staffServices).where(eq(staffServices.staffId, row.id));
          if (input.serviceIds.length) {
            await tx
              .insert(staffServices)
              .values(input.serviceIds.map((sid) => ({ id: nanoid(), staffId: row.id, serviceId: sid })));
          }
        }

        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "staff.updated",
          entityType: "staff",
          entityId: row.id,
          meta: { name: input.name, isActive: input.isActive, role: input.role },
        });
      });

      return { id: row.id };
    }),
});
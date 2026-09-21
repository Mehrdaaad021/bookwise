// src/server/routers/services.ts
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { assertRole, protectedProcedure, requireOrgMembership, router } from "../trpc";
import { recordAudit } from "../audit";
import { services } from "@/db/schema/services";
import { staffProfiles, staffServices } from "@/db/schema/staff";
import { createServiceSchema } from "@/lib/validations";

export const servicesRouter = router({
  listAdminServices: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]); // 🔒 read is admin-only

      const rows = await ctx.db.query.services.findMany({
        where: eq(services.organizationId, input.organizationId),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });

      const rowIds = rows.map((r) => r.id);
      const links = rowIds.length
        ? await ctx.db.query.staffServices.findMany({ where: inArray(staffServices.serviceId, rowIds) })
        : [];
      const staffRows = await ctx.db.query.staffProfiles.findMany({
        where: eq(staffProfiles.organizationId, input.organizationId),
      });
      const staffMap = new Map(staffRows.map((s) => [s.id, s.name]));

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        shortDescription: r.shortDescription,
        durationMinutes: r.durationMinutes,
        priceFils: r.priceFils,
        bufferBeforeMinutes: r.bufferBeforeMinutes,
        bufferAfterMinutes: r.bufferAfterMinutes,
        isActive: r.isActive,
        isArchived: r.isArchived,
        staff: links
          .filter((l) => l.serviceId === r.id)
          .map((l) => ({ id: l.staffId, name: staffMap.get(l.staffId) ?? "—" })),
      }));
    }),

  listStaffOptions: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]); // 🔒 read is admin-only

      const rows = await ctx.db.query.staffProfiles.findMany({
        where: eq(staffProfiles.organizationId, input.organizationId),
        orderBy: (s, { asc }) => [asc(s.displayOrder)],
      });
      return rows.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive }));
    }),

  createService: protectedProcedure
    .input(createServiceSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);

      const id = nanoid();
      const slug =
        input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + nanoid(6);

      await ctx.db.transaction(async (tx) => {
        await tx.insert(services).values({
          id,
          organizationId: input.organizationId,
          categoryId: input.categoryId ?? null,
          name: input.name,
          slug,
          shortDescription: input.shortDescription ?? null,
          longDescription: input.longDescription ?? null,
          durationMinutes: input.durationMinutes,
          bufferBeforeMinutes: input.bufferBeforeMinutes,
          bufferAfterMinutes: input.bufferAfterMinutes,
          priceFils: input.priceFils,
          depositFils: input.depositFils,
          depositType: input.depositType,
          taxRatePercent: input.taxRatePercent,
          isActive: input.isActive,
        });
        if (input.staffIds?.length) {
          await tx
            .insert(staffServices)
            .values(input.staffIds.map((sid) => ({ id: nanoid(), staffId: sid, serviceId: id })));
        }
        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "service.created",
          entityType: "service",
          entityId: id,
          meta: { name: input.name, priceFils: input.priceFils, durationMinutes: input.durationMinutes },
        });
      });

      return { id };
    }),

  updateService: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        serviceId: z.string(),
        name: z.string().min(1).max(255).optional(),
        priceFils: z.number().int().min(0).optional(),
        durationMinutes: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        staffIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);

      const svc = await ctx.db.query.services.findFirst({
        where: and(eq(services.id, input.serviceId), eq(services.organizationId, input.organizationId)),
      });
      if (!svc) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(services)
          .set({
            name: input.name ?? svc.name,
            priceFils: input.priceFils ?? svc.priceFils,
            durationMinutes: input.durationMinutes ?? svc.durationMinutes,
            isActive: input.isActive ?? svc.isActive,
            isArchived: input.isArchived ?? svc.isArchived,
            updatedAt: new Date(),
          })
          .where(eq(services.id, svc.id));

        if (input.staffIds) {
          await tx.delete(staffServices).where(eq(staffServices.serviceId, svc.id));
          if (input.staffIds.length) {
            await tx
              .insert(staffServices)
              .values(input.staffIds.map((sid) => ({ id: nanoid(), staffId: sid, serviceId: svc.id })));
          }
        }

        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "service.updated",
          entityType: "service",
          entityId: svc.id,
          meta: {
            name: input.name,
            isActive: input.isActive,
            isArchived: input.isArchived,
            priceFils: input.priceFils,
          },
        });
      });

      return { id: svc.id };
    }),
});
// src/server/routers/audit.ts
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { assertRole, protectedProcedure, requireOrgMembership, router } from "../trpc";
import { auditLogs } from "@/db/schema";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";

export const auditRouter = router({
  listAuditLogs: protectedProcedure
    .input(z.object({ organizationId: z.string(), limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner"]);

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      const tz = org?.timezone ?? "Asia/Dubai";

      const rows = await ctx.db.query.auditLogs.findMany({
        where: eq(auditLogs.organizationId, input.organizationId),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
        limit: input.limit,
      });

      const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
      const usersRows = userIds.length
        ? await ctx.db.query.users.findMany({ where: inArray(users.id, userIds) })
        : [];
      const nameMap = new Map(usersRows.map((u) => [u.id, u.name ?? u.email ?? "user"]));

      return rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        meta: r.details as Record<string, unknown> | null,
        actorName: r.userId ? nameMap.get(r.userId) ?? r.userId : "system",
        atLocal: format(toZonedTime(r.createdAt, tz), "MMM d yyyy · HH:mm:ss"),
      }));
    }),
});
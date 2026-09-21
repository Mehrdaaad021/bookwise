// src/server/audit.ts
import { nanoid } from "nanoid";
import { auditLogs } from "@/db/schema";

/**
 * Structural executor type: anything that can insert an audit row.
 * Accepts BOTH the plain `db` client and a transaction (`tx`) handle,
 * without coupling to a concrete driver class.
 */
export type AuditExecutor = {
  insert(table: typeof auditLogs): {
    values(value: typeof auditLogs.$inferInsert): PromiseLike<unknown>;
  };
};

/**
 * Central audit trail writer.
 * Every sensitive mutation must leave a forensic row here.
 */
export async function recordAudit(
  exe: AuditExecutor,
  entry: {
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: Record<string, unknown> | null;
  }
): Promise<void> {
  await exe.insert(auditLogs).values({
    id: nanoid(),
    organizationId: entry.organizationId,
    userId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    details: entry.meta ?? null,
  });
}
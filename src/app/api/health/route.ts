// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe for uptime monitors (UptimeRobot, BetterStack...).
 * Returns 200 only when the app AND the database are reachable.
 */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: "ok",
      db: "up",
      latencyMs: Date.now() - started,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: "degraded", db: "down", error: String(error) },
      { status: 503 }
    );
  }
}
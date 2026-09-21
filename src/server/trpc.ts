// src/server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema/organizations";

export const createTRPCContext = async () => {
  const session = await auth();
  return { db, session };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 🔒 نگهبان اول: باید لاگین کرده باشه
const isAuthed = t.middleware(({ ctx, next }) => {
  const userId = ctx.session?.user?.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in" });
  }
  return next({ ctx: { ...ctx, userId } });
});

export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * 🔒 نگهبان دوم: عضویت در سازمان.
 * هر procedure مربوط به کسب‌وکار MUST این رو صدا بزنه.
 * هرگز به فیلدهای مالکیتی که از کلاینت میاد اعتماد نمی‌کنیم.
 */
export async function requireOrgMembership(ctx: TRPCContext, organizationId: string) {
  const userId = ctx.session?.user?.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in" });
  }

  const membership = await ctx.db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.isActive, true),
    ),
  });

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this workspace" });
  }

  return membership;
}

// 🛡️ نگهبان سوم: نقش‌ها
export function assertRole(role: string, allowed: Array<"owner" | "manager" | "staff">) {
  if (!allowed.includes(role as "owner" | "manager" | "staff")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role does not allow this action" });
  }
}
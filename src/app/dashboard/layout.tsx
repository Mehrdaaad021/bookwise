// src/app/dashboard/layout.tsx
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema/organizations";
import { WorkspaceShell } from "./workspace-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 🔐 SERVER-SIDE GATE: a valid session alone is NOT enough.
  // Without an active organization membership, the workspace never renders.
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, session.user.id),
      eq(organizationMembers.isActive, true)
    ),
  });
  if (!membership) redirect("/");

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.email ?? "User",
        email: session.user.email ?? "",
      }}
    >
      {children}
    </WorkspaceShell>
  );
}
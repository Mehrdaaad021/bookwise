// src/app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WorkspaceShell } from "./workspace-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
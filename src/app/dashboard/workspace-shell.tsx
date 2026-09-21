// src/app/dashboard/workspace-shell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Calendar, Clock, Scissors, Users,
  CalendarClock, UserCircle, BarChart3, Settings, Menu, Bell, LogOut, Sparkles, ScrollText,
} from "lucide-react";

const navGroups: { label: string; items: { href: string; label: string; icon: any }[] }[] = [
  {
    label: "Operate",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
      { href: "/dashboard/appointments", label: "Appointments", icon: Clock },
      { href: "/dashboard/customers", label: "Customers", icon: UserCircle },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/dashboard/services", label: "Services", icon: Scissors },
      { href: "/dashboard/staff", label: "Staff", icon: Users },
      { href: "/dashboard/availability", label: "Availability", icon: CalendarClock },
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
];

const STAFF_VISIBLE = ["/dashboard", "/dashboard/calendar", "/dashboard/appointments", "/dashboard/customers"];
const OWNER_ONLY = ["/dashboard/audit"];
const MANAGER_HIDDEN: string[] = [];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.bw-shell { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; display: flex; min-height: 100vh; background: #f6f5f2; color: #171512; }
.bw-side { width: 250px; flex-shrink: 0; background: #fff; border-right: 1px solid #e8e5df; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.bw-side-logo { display: flex; align-items: center; gap: 10px; padding: 18px 20px; font-weight: 800; font-size: 16px; letter-spacing: -0.02em; border-bottom: 1px solid #f0eee9; }
.bw-mark { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.bw-ws { margin: 14px 14px 6px; padding: 10px 12px; border: 1px solid #e8e5df; border-radius: 12px; background: #faf9f6; }
.bw-ws b { display: block; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-ws span { display: inline-flex; align-items: center; gap: 5px; margin-top: 5px; font-size: 10.5px; font-weight: 700; color: #78716c; text-transform: capitalize; }
.bw-ws span i { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
.bw-nav { flex: 1; overflow-y: auto; padding: 8px 12px 16px; }
.bw-group { margin-top: 14px; padding: 0 10px; font-size: 10.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: #a8a29e; }
.bw-item { display: flex; align-items: center; gap: 10px; margin-top: 3px; padding: 8px 10px; border-radius: 9px; font-size: 13.5px; font-weight: 600; color: #57534e; transition: all .12s; }
.bw-item:hover { background: #f5f4f0; color: #171512; }
.bw-item.on { background: #fdeee2; color: #c2410c; }
.bw-item svg { width: 16px; height: 16px; }
.bw-side-foot { padding: 12px; border-top: 1px solid #f0eee9; }
.bw-user { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; }
.bw-avatar { width: 32px; height: 32px; border-radius: 50%; background: #171512; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.bw-user b { display: block; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-user span { font-size: 11px; color: #78716c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.bw-out { width: 100%; margin-top: 6px; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 9px; font-size: 13px; font-weight: 600; color: #78716c; background: none; border: none; cursor: pointer; }
.bw-out:hover { background: #f5f4f0; color: #b91c1c; }
.bw-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.bw-top { height: 58px; flex-shrink: 0; background: rgba(255,255,255,.82); backdrop-filter: blur(10px); border-bottom: 1px solid #e8e5df; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 10; }
.bw-top-left { display: flex; align-items: center; gap: 12px; }
.bw-date { font-size: 13px; color: #78716c; font-weight: 500; }
.bw-env { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #a16207; background: #fef9c3; border: 1px solid #fde68a; border-radius: 999px; padding: 3px 10px; }
.bw-top-right { display: flex; align-items: center; gap: 8px; }
.bw-bell { position: relative; width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #57534e; background: none; border: none; cursor: pointer; }
.bw-bell:hover { background: #f5f4f0; }
.bw-bell i { position: absolute; top: 8px; right: 8px; width: 6px; height: 6px; border-radius: 50%; background: #ea580c; }
.bw-content { padding: 26px 28px 48px; width: 100%; max-width: 1180px; margin: 0 auto; }
@media (max-width: 1024px) { .bw-side { display: none; } }
`;

export function WorkspaceShell({ user, children }: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();

  const role = ws?.role ?? null;

  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (OWNER_ONLY.includes(i.href)) return role === "owner";
        if (MANAGER_HIDDEN.includes(i.href)) return role !== "manager";
        if (role === "staff") return STAFF_VISIBLE.includes(i.href);
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  const sidebar = (
    <>
      <div className="bw-side-logo">
        <span className="bw-mark"><Sparkles size={15} /></span>
        Bookwise
      </div>
      <div className="bw-ws">
        <b>{ws?.organization.name ?? "Loading workspace..."}</b>
        <span><i /> {role ?? "—"}</span>
      </div>
      <nav className="bw-nav" aria-label="Workspace">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            <div className="bw-group">{g.label}</div>
            {g.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={`bw-item ${active ? "on" : ""}`}>
                  <item.icon /> {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="bw-side-foot">
        <div className="bw-user">
          <span className="bw-avatar">{user.name.charAt(0).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <b>{user.name}</b>
            <span>{user.email}</span>
          </div>
        </div>
        <button className="bw-out" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="bw-shell">
      <style>{css}</style>
      <aside className="bw-side">{sidebar}</aside>

      <div className="bw-main">
        <header className="bw-top">
          <div className="bw-top-left">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="lg:hidden" style={{ display: "none" }} aria-label="Open navigation">
                <Menu size={18} />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">{sidebar}</SheetContent>
            </Sheet>
            <button className="bw-bell" style={{ display: "none" }} aria-hidden="true"><Bell size={16} /><i /></button>
            <span className="bw-date">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
            {ws?.organization.isDemo && <span className="bw-env">Demo workspace</span>}
          </div>
          <div className="bw-top-right">
            <a href={`/book/${ws?.organization.slug ?? ""}`} target="_blank" rel="noreferrer"
              className="bw-item" style={{ margin: 0, padding: "7px 12px", border: "1px solid #e8e5df", background: "#fff" }}>
              View public page
            </a>
          </div>
        </header>
        <main className="bw-content">{children}</main>
      </div>
    </div>
  );
}
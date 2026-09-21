// src/app/dashboard/workspace-shell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Calendar, Clock, Scissors, Users,
  CalendarClock, UserCircle, BarChart3, Settings, Menu, Bell, LogOut, Sparkles, ExternalLink, ScrollText,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/appointments", label: "Appointments", icon: Clock },
  { href: "/dashboard/services", label: "Services", icon: Scissors },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/availability", label: "Availability", icon: CalendarClock },
  { href: "/dashboard/customers", label: "Customers", icon: UserCircle },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
];

const STAFF_VISIBLE = ["/dashboard", "/dashboard/calendar", "/dashboard/appointments", "/dashboard/customers"];
const OWNER_ONLY = ["/dashboard/audit"];

export function WorkspaceShell({ user, children }: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();

  const role = ws?.role ?? null;
  const visibleNav = navItems.filter((i) => {
    if (OWNER_ONLY.includes(i.href)) return role === "owner";
    if (role === "staff") return STAFF_VISIBLE.includes(i.href);
    return true;
  });

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <h1 className="font-bold text-stone-800">Bookwise</h1>
        </div>
        <p className="text-xs text-stone-500 mt-1 truncate">{ws?.organization.name ?? "Loading workspace..."}</p>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {ws?.organization.isDemo && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
              Demo Workspace
            </Badge>
          )}
          {role && (
            <Badge variant="outline" className="bg-stone-50 text-stone-600 border-stone-200 text-[10px] capitalize">
              {role}
            </Badge>
          )}
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Workspace">
        {visibleNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-orange-50 text-orange-700" : "text-stone-600 hover:bg-stone-100"
              }`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-stone-200 space-y-1">
        <a href={`/book/${ws?.organization.slug ?? ""}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">
          <ExternalLink className="w-4 h-4" /> View public page
        </a>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex h-screen bg-[#FDFBF7]">
        <aside className="hidden lg:flex w-64 flex-col border-r border-stone-200 bg-white">{sidebar}</aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
            <div className="flex items-center gap-3">
              <SheetTrigger className="lg:hidden inline-flex items-center justify-center rounded-md h-9 w-9 text-stone-600 hover:bg-stone-100 transition-colors">
                <Menu className="w-5 h-5" />
              </SheetTrigger>
              <span className="text-sm text-stone-500">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-sm font-semibold" aria-label={`Signed in as ${user.name}`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
        <SheetContent side="left" className="w-64 p-0">{sidebar}</SheetContent>
      </div>
    </Sheet>
  );
}
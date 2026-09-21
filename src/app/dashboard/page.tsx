// src/app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, ExternalLink } from "lucide-react";

export default function DashboardOverviewPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const { data: dash, isLoading } = trpc.workspace.getDashboard.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );

  const stats = [
    { label: "Today's appointments", value: dash ? String(dash.todayCount) : "—", icon: Calendar, color: "text-orange-600 bg-orange-50" },
    { label: "Customers", value: dash ? String(dash.customerCount) : "—", icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Completed revenue", value: dash ? `AED ${(dash.completedRevenueFils / 100).toLocaleString()}` : "—", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Overview</h1>
          <p className="text-sm text-stone-500">Timezone: {dash?.timezone ?? ws?.organization.timezone ?? "—"}</p>
        </div>
        <Link href={`/book/${ws?.organization.slug ?? ""}`} target="_blank">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <ExternalLink className="w-4 h-4 mr-2" /> Public booking page
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-10 bg-stone-100 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-sm border-stone-200">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800">{s.value}</p>
                  <p className="text-xs text-stone-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="shadow-sm border-stone-200">
        <CardHeader><CardTitle className="text-base">Upcoming appointments</CardTitle></CardHeader>
        <CardContent>
          {!dash ? null : dash.upcoming.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">No upcoming appointments yet.</p>
          ) : (
            <div className="space-y-2">
              {dash.upcoming.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-100">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{a.serviceName} — {a.customerName}</p>
                    <p className="text-xs text-stone-500">{a.staffName} · {a.whenLocal}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === "confirmed" ? "bg-emerald-100 text-emerald-700"
                    : a.status === "pending" ? "bg-amber-100 text-amber-700"
                    : "bg-stone-100 text-stone-600"
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
// src/app/dashboard/reports/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CalendarCheck, UserPlus, TrendingDown } from "lucide-react";

export default function ReportsPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const [rangeDays, setRangeDays] = useState(30);

  const { data, isLoading } = trpc.reports.getReports.useQuery(
    { organizationId: ws?.organization.id ?? "", rangeDays },
    { enabled: !!ws?.organization.id }
  );

  const maxRev = Math.max(...(data?.revenueByDay.map((d) => d.revenueFils) ?? [1]), 1);
  const maxSvc = Math.max(...(data?.topServices.map((s) => s.count) ?? [1]), 1);

  const cards = [
    { label: "Completed revenue", value: data ? `AED ${(data.totals.completedRevenueFils / 100).toLocaleString()}` : "—", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "Appointments", value: data ? String(data.totals.appointments) : "—", icon: CalendarCheck, color: "text-orange-600 bg-orange-50" },
    { label: "New customers", value: data ? String(data.totals.newCustomers) : "—", icon: UserPlus, color: "text-blue-600 bg-blue-50" },
    { label: "Cancellation rate", value: data ? `${(data.totals.cancellationRate * 100).toFixed(0)}%` : "—", icon: TrendingDown, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Reports</h1>
          <p className="text-sm text-stone-500">Business timezone: {data?.timezone ?? "—"}</p>
        </div>
        <div className="flex rounded-lg border border-stone-300 overflow-hidden">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setRangeDays(d)}
              className={`px-3 py-1.5 text-sm font-medium ${rangeDays === d ? "bg-orange-500 text-white" : "bg-white text-stone-600"}`}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-stone-500">Crunching numbers...</CardContent></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
              <Card key={c.label} className="shadow-sm border-stone-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-stone-800">{c.value}</p>
                    <p className="text-xs text-stone-500">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-sm border-stone-200">
              <CardHeader><CardTitle className="text-base">Completed revenue per day</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-36">
                  {data.revenueByDay.map((d) => (
                    <div key={d.date} className="flex-1 h-full flex items-end"
                      title={`${d.date} — AED ${(d.revenueFils / 100).toFixed(0)} (${d.count} bookings)`}>
                      <div
                        className={`w-full rounded-t ${d.revenueFils > 0 ? "bg-orange-400" : "bg-stone-100"}`}
                        style={{ height: `${Math.max((d.revenueFils / maxRev) * 100, 2)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>{data.revenueByDay[0]?.date}</span>
                  <span>{data.revenueByDay[data.revenueByDay.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-stone-200">
              <CardHeader><CardTitle className="text-base">Top services</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.topServices.length === 0 && <p className="text-sm text-stone-400">No data in range.</p>}
                {data.topServices.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>{s.name}</span>
                      <span>{s.count} bookings · AED {(s.revenueFils / 100).toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(s.count / maxSvc) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-stone-200">
              <CardHeader><CardTitle className="text-base">Status breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.statusCounts).map(([status, count]) => (
                    <span key={status} className="text-xs px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600">
                      {status.replace(/_/g, " ")}: <span className="font-semibold">{count}</span>
                    </span>
                  ))}
                  {Object.keys(data.statusCounts).length === 0 && <p className="text-sm text-stone-400">No data in range.</p>}
                </div>
                <p className="text-xs text-stone-400 mt-3">
                  No-show rate: {(data.totals.noShowRate * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-stone-200">
              <CardHeader><CardTitle className="text-base">Staff load</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.staffLoad.length === 0 && <p className="text-sm text-stone-400">No data in range.</p>}
                {data.staffLoad.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{s.name}</span>
                    <span className="text-xs text-stone-500">
                      {s.count} appointments · {(s.minutes / 60).toFixed(1)}h booked
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
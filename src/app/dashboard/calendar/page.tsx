// src/app/dashboard/calendar/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-emerald-400",
  checked_in: "bg-blue-400",
  in_progress: "bg-blue-500",
  completed: "bg-stone-400",
  cancelled: "bg-red-400",
  no_show: "bg-stone-300",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 .. 20:00

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysStr(dateStr: string, n: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toKey(d);
}

function weekStartOf(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toKey(d);
}

export default function CalendarPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const [view, setView] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState(() => toKey(new Date()));

  const startDate = view === "day" ? anchor : weekStartOf(anchor);
  const days = view === "day" ? 1 : 7;

  const { data, isLoading } = trpc.workspace.getCalendarAppointments.useQuery(
    { organizationId: ws?.organization.id ?? "", startDate, days },
    { enabled: !!ws?.organization.id }
  );

  const shift = (dir: number) => setAnchor(addDaysStr(anchor, dir * (view === "day" ? 1 : 7)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Calendar</h1>
          <p className="text-sm text-stone-500">Timezone: {data?.timezone ?? ws?.organization.timezone ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-stone-300 overflow-hidden">
            <button onClick={() => setView("day")}
              className={`px-3 py-1.5 text-sm font-medium ${view === "day" ? "bg-orange-500 text-white" : "bg-white text-stone-600"}`}>
              Day
            </button>
            <button onClick={() => setView("week")}
              className={`px-3 py-1.5 text-sm font-medium ${view === "week" ? "bg-orange-500 text-white" : "bg-white text-stone-600"}`}>
              Week
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(toKey(new Date()))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dot}`} /> {status.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-stone-500">Loading calendar...</CardContent></Card>
      ) : view === "day" ? (
        <Card className="shadow-sm border-stone-200">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-stone-200 text-sm font-medium text-stone-700">
              {new Date(anchor + "T12:00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            {HOURS.map((h) => {
              const items = data?.days[0]?.items.filter((it) => it.localHour === h) ?? [];
              return (
                <div key={h} className="flex border-b border-stone-100 min-h-[56px]">
                  <div className="w-16 shrink-0 px-2 py-2 text-xs text-stone-400 border-r border-stone-100">
                    {String(h).padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 p-1.5 space-y-1.5">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[it.status]}`} />
                        <span className="text-xs font-medium text-stone-700 w-12">{it.localTime}</span>
                        <span className="text-sm text-stone-800">{it.serviceName} — {it.customerName}</span>
                        <span className="text-xs text-stone-400 ml-auto">{it.staffName}</span>
                        <span className="text-[10px] uppercase text-stone-400">{it.status.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {data?.days.map((day) => (
            <Card key={day.date} className="shadow-sm border-stone-200">
              <CardContent className="p-2">
                <p className="text-xs font-medium text-stone-600 text-center mb-2">
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <div className="space-y-1 min-h-[120px]">
                  {day.items.length === 0 && <p className="text-[10px] text-stone-300 text-center">—</p>}
                  {day.items.map((it) => (
                    <button key={it.id} onClick={() => { setAnchor(day.date); setView("day"); }}
                      className="w-full text-left rounded-md border border-stone-100 bg-stone-50 hover:bg-orange-50 px-1.5 py-1">
                      <p className="text-[10px] font-medium text-stone-700">{it.localTime} · {it.serviceName}</p>
                      <p className="text-[10px] text-stone-400 truncate">{it.customerName}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
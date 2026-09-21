// src/app/dashboard/availability/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.availability.getAvailabilitySettings.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );

  const refresh = () => utils.availability.getAvailabilitySettings.invalidate();

  const upsertHours = trpc.availability.upsertBusinessHours.useMutation({ onSuccess: refresh });
  const addHoliday = trpc.availability.addHoliday.useMutation({ onSuccess: refresh });
  const deleteHoliday = trpc.availability.deleteHoliday.useMutation({ onSuccess: refresh });
  const addTimeOff = trpc.availability.addTimeOff.useMutation({ onSuccess: refresh });
  const deleteTimeOff = trpc.availability.deleteTimeOff.useMutation({ onSuccess: refresh });
  const addBreak = trpc.availability.addBreak.useMutation({ onSuccess: refresh });
  const deleteBreak = trpc.availability.deleteBreak.useMutation({ onSuccess: refresh });

  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [toStaff, setToStaff] = useState("");
  const [toStart, setToStart] = useState("");
  const [toEnd, setToEnd] = useState("");
  const [toReason, setToReason] = useState("");
  const [brStaff, setBrStaff] = useState("");
  const [brDay, setBrDay] = useState("1");
  const [brStart, setBrStart] = useState("13:00");
  const [brEnd, setBrEnd] = useState("14:00");

  const inputCls = "px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-300";

  if (isLoading) return <div className="p-8 text-center text-stone-500">Loading availability...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Availability</h1>
        <p className="text-sm text-stone-500">Business hours, holidays, breaks, and time off</p>
      </div>

      <Card className="shadow-sm border-stone-200">
        <CardHeader><CardTitle className="text-base">Business hours (per weekday)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.businessHours ?? []).map((row) => (
            <BusinessHoursRow key={row.dayOfWeek} row={row}
              saving={upsertHours.isPending}
              onSave={(payload) => upsertHours.mutate({ organizationId: ws!.organization.id, ...payload })} />
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-stone-200">
          <CardHeader><CardTitle className="text-base">Holidays & closures</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className={inputCls} />
              <input placeholder="Name (e.g. National Day)" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} className={inputCls + " flex-1 min-w-[140px]"} />
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!holidayDate || !holidayName || addHoliday.isPending}
                onClick={() => addHoliday.mutate({ organizationId: ws!.organization.id, date: holidayDate, name: holidayName })}>
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
            <div className="space-y-1.5">
              {(data?.holidays ?? []).length === 0 && <p className="text-xs text-stone-400">No holidays defined.</p>}
              {(data?.holidays ?? []).map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded-lg border border-stone-100 bg-stone-50 text-sm">
                  <span className="text-stone-700">{h.date} — {h.name}</span>
                  <button onClick={() => deleteHoliday.mutate({ organizationId: ws!.organization.id, holidayId: h.id })}
                    className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-stone-200">
          <CardHeader><CardTitle className="text-base">Staff time off</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={toStaff} onChange={(e) => setToStaff(e.target.value)} className={inputCls}>
                <option value="">Select staff...</option>
                {(data?.staffOptions ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input placeholder="Reason" value={toReason} onChange={(e) => setToReason(e.target.value)} className={inputCls} />
              <input type="date" value={toStart} onChange={(e) => setToStart(e.target.value)} className={inputCls} />
              <input type="date" value={toEnd} onChange={(e) => setToEnd(e.target.value)} className={inputCls} />
            </div>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!toStaff || !toStart || !toEnd || addTimeOff.isPending}
              onClick={() => addTimeOff.mutate({ organizationId: ws!.organization.id, staffId: toStaff, startDate: toStart, endDate: toEnd, reason: toReason || undefined })}>
              <Plus className="w-4 h-4 mr-1" /> Add time off
            </Button>
            <div className="space-y-1.5">
              {(data?.timeOff ?? []).length === 0 && <p className="text-xs text-stone-400">No time off recorded.</p>}
              {(data?.timeOff ?? []).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg border border-stone-100 bg-stone-50 text-sm">
                  <span className="text-stone-700">{t.staffName}: {t.startDate} → {t.endDate}{t.reason ? ` (${t.reason})` : ""}</span>
                  <button onClick={() => deleteTimeOff.mutate({ organizationId: ws!.organization.id, timeOffId: t.id })}
                    className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-stone-200">
        <CardHeader><CardTitle className="text-base">Recurring weekly breaks</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={brStaff} onChange={(e) => setBrStaff(e.target.value)} className={inputCls}>
              <option value="">Select staff...</option>
              {(data?.staffOptions ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={brDay} onChange={(e) => setBrDay(e.target.value)} className={inputCls}>
              {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            <input type="time" value={brStart} onChange={(e) => setBrStart(e.target.value)} className={inputCls} />
            <input type="time" value={brEnd} onChange={(e) => setBrEnd(e.target.value)} className={inputCls} />
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!brStaff || addBreak.isPending}
              onClick={() => addBreak.mutate({ organizationId: ws!.organization.id, staffId: brStaff, dayOfWeek: Number(brDay), startTime: brStart, endTime: brEnd, label: "Break" })}>
              <Plus className="w-4 h-4" /> Add break
            </Button>
          </div>
          <div className="space-y-1.5">
            {(data?.breaks ?? []).length === 0 && <p className="text-xs text-stone-400">No breaks defined.</p>}
            {(data?.breaks ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-lg border border-stone-100 bg-stone-50 text-sm">
                <span className="text-stone-700">{b.staffName} · {DAY_NAMES[b.dayOfWeek]} · {b.startTime}–{b.endTime}</span>
                <button onClick={() => deleteBreak.mutate({ organizationId: ws!.organization.id, breakId: b.id })}
                  className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessHoursRow({ row, saving, onSave }: {
  row: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };
  saving: boolean;
  onSave: (p: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(row.isOpen);
  const [openTime, setOpenTime] = useState(row.openTime);
  const [closeTime, setCloseTime] = useState(row.closeTime);

  const dirty = isOpen !== row.isOpen || openTime !== row.openTime || closeTime !== row.closeTime;
  const inputCls = "px-2 py-1.5 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg border border-stone-100 bg-stone-50">
      <span className="w-24 text-sm font-medium text-stone-700">{DAY_NAMES[row.dayOfWeek]}</span>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="rounded border-stone-300" />
        Open
      </label>
      <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} disabled={!isOpen} className={inputCls} />
      <span className="text-stone-400 text-sm">to</span>
      <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} disabled={!isOpen} className={inputCls} />
      <Button size="sm" variant="outline" disabled={!dirty || saving}
        onClick={() => onSave({ dayOfWeek: row.dayOfWeek, isOpen, openTime, closeTime })}>
        Save
      </Button>
    </div>
  );
}
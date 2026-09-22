// src/app/dashboard/availability/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Trash2, Plus } from "lucide-react";
import "../dash.css";

const extraCss = `
.hrow { display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-bottom: 1px solid #f5f4f0; flex-wrap: wrap; }
.hrow:last-child { border-bottom: none; }
.hrow .day { width: 96px; font-size: 13px; font-weight: 700; }
.hrow .input { width: auto; }
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fgrid .full { grid-column: 1 / -1; }
.mini-form { padding: 14px 18px; background: #faf9f6; border-top: 1px solid #f0eee9; }
.listrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 18px; border-bottom: 1px solid #f5f4f0; font-size: 13px; }
.listrow:last-child { border-bottom: none; }
.listrow .meta { color: #78716c; font-size: 12px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 1000px) { .grid2 { grid-template-columns: 1fr; } }
`;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();
  const orgId = ws?.organization.id ?? "";

  const { data, isLoading } = trpc.availability.getAvailabilitySettings.useQuery(
    { organizationId: orgId }, { enabled: !!orgId }
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

  if (isLoading || !data) return <div className="panel"><div className="empty">Loading availability...</div></div>;

  return (
    <div>
      <style>{extraCss}</style>
      <div className="dh">
        <div>
          <h1>Availability</h1>
          <p>Business hours, holidays, breaks and time-off — the inputs of the scheduling engine</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head"><h2>Weekly business hours</h2></div>
        {data.businessHours.map((h) => (
          <div className="hrow" key={h.dayOfWeek}>
            <span className="day">{DAYS[h.dayOfWeek]}</span>
            <label className="chk" style={{ width: 90 }}>
              <input
                type="checkbox"
                checked={h.isOpen}
                onChange={(e) => upsertHours.mutate({
                  organizationId: orgId, dayOfWeek: h.dayOfWeek,
                  isOpen: e.target.checked, openTime: h.openTime, closeTime: h.closeTime,
                })}
              />
              Open
            </label>
            <input
              type="time" className="input" value={h.openTime}
              onChange={(e) => upsertHours.mutate({
                organizationId: orgId, dayOfWeek: h.dayOfWeek,
                isOpen: h.isOpen, openTime: e.target.value, closeTime: h.closeTime,
              })}
            />
            <span style={{ color: "#a8a29e" }}>→</span>
            <input
              type="time" className="input" value={h.closeTime}
              onChange={(e) => upsertHours.mutate({
                organizationId: orgId, dayOfWeek: h.dayOfWeek,
                isOpen: h.isOpen, openTime: h.openTime, closeTime: e.target.value,
              })}
            />
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-head"><h2>Holidays (closed days)</h2></div>
          {data.holidays.length === 0 && <div className="empty">No holidays registered.</div>}
          {data.holidays.map((h) => (
            <div className="listrow" key={h.id}>
              <div>
                <b>{h.name}</b>
                <div className="meta">{h.date}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteHoliday.mutate({ organizationId: orgId, holidayId: h.id })}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
          <div className="mini-form fgrid">
            <input type="date" className="input" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            <input className="input" placeholder="Holiday name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
            <button
              className="btn btn-dark full"
              disabled={!holidayDate || !holidayName}
              onClick={() => { addHoliday.mutate({ organizationId: orgId, date: holidayDate, name: holidayName }); setHolidayDate(""); setHolidayName(""); }}
            >
              <Plus size={13} /> Add holiday
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Staff time-off</h2></div>
          {data.timeOff.length === 0 && <div className="empty">No time-off registered.</div>}
          {data.timeOff.map((t) => (
            <div className="listrow" key={t.id}>
              <div>
                <b>{t.staffName}</b>
                <div className="meta">{t.startDate} → {t.endDate}{t.reason ? ` · ${t.reason}` : ""}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteTimeOff.mutate({ organizationId: orgId, timeOffId: t.id })}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
          <div className="mini-form fgrid">
            <select className="input" value={toStaff} onChange={(e) => setToStaff(e.target.value)}>
              <option value="">Professional...</option>
              {data.staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" placeholder="Reason" value={toReason} onChange={(e) => setToReason(e.target.value)} />
            <input type="date" className="input" value={toStart} onChange={(e) => setToStart(e.target.value)} />
            <input type="date" className="input" value={toEnd} onChange={(e) => setToEnd(e.target.value)} />
            <button
              className="btn btn-dark full"
              disabled={!toStaff || !toStart || !toEnd}
              onClick={() => { addTimeOff.mutate({ organizationId: orgId, staffId: toStaff, startDate: toStart, endDate: toEnd, reason: toReason || undefined }); setToStart(""); setToEnd(""); }}
            >
              <Plus size={13} /> Add time-off
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head"><h2>Recurring weekly breaks</h2></div>
        {data.breaks.length === 0 && <div className="empty">No recurring breaks.</div>}
        {data.breaks.map((b) => (
          <div className="listrow" key={b.id}>
            <div>
              <b>{b.staffName}</b>
              <div className="meta">{DAYS[b.dayOfWeek]} · {b.startTime}–{b.endTime}{b.label ? ` · ${b.label}` : ""}</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => deleteBreak.mutate({ organizationId: orgId, breakId: b.id })}>
              <Trash2 size={12} /> Remove
            </button>
          </div>
        ))}
        <div className="mini-form fgrid">
          <select className="input" value={brStaff} onChange={(e) => setBrStaff(e.target.value)}>
            <option value="">Professional...</option>
            {data.staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={brDay} onChange={(e) => setBrDay(e.target.value)}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <input type="time" className="input" value={brStart} onChange={(e) => setBrStart(e.target.value)} />
          <input type="time" className="input" value={brEnd} onChange={(e) => setBrEnd(e.target.value)} />
          <button
            className="btn btn-dark full"
            disabled={!brStaff}
            onClick={() => addBreak.mutate({ organizationId: orgId, staffId: brStaff, dayOfWeek: Number(brDay), startTime: brStart, endTime: brEnd })}
          >
            <Plus size={13} /> Add break
          </button>
        </div>
      </div>
    </div>
  );
}
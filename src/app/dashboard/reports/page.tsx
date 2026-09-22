// src/app/dashboard/reports/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { formatFils } from "@/lib/money";
import { CalendarDays, Wallet, Users, TrendingDown } from "lucide-react";
import "../dash.css";

const extraCss = `
.rep-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
@media (max-width: 1000px) { .rep-grid { grid-template-columns: 1fr; } }
.bars { display: flex; align-items: flex-end; gap: 5px; height: 190px; padding: 14px 4px 0; }
.bars .col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; height: 100%; min-width: 0; }
.bars .bar { background: linear-gradient(180deg, #fb923c, #ea580c); border-radius: 6px 6px 0 0; min-height: 3px; }
.bars .bar.zero { background: #eeece7; }
.bars .lbl { font-size: 9px; color: #a8a29e; text-align: center; white-space: nowrap; overflow: hidden; }
`;

export default function ReportsPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const orgId = ws?.organization.id ?? "";
  const [rangeDays, setRangeDays] = useState(30);

  const { data, isLoading } = trpc.reports.getReports.useQuery(
    { organizationId: orgId, rangeDays },
    { enabled: !!orgId }
  );

  const maxRev = Math.max(1, ...(data?.revenueByDay.map((d) => d.revenueFils) ?? [1]));

  return (
    <div>
      <style>{extraCss}</style>
      <div className="dh">
        <div>
          <h1>Reports</h1>
          <p>Revenue, demand and load — computed from real appointments</p>
        </div>
        <div className="dh-actions">
          <select className="select" value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="panel"><div className="empty">Crunching numbers...</div></div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#fef3e7", color: "#ea580c" }}><CalendarDays size={14} /></i> Appointments</div>
              <div className="val">{data.totals.appointments}</div>
              <div className="hint">in the selected range</div>
            </div>
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#eef7ee", color: "#16a34a" }}><Wallet size={14} /></i> Completed revenue</div>
              <div className="val">{formatFils(data.totals.completedRevenueFils)}</div>
              <div className="hint">completed appointments only</div>
            </div>
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#eef2ff", color: "#4f46e5" }}><Users size={14} /></i> New customers</div>
              <div className="val">{data.totals.newCustomers}</div>
              <div className="hint">first booking in range</div>
            </div>
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#fef2f2", color: "#b91c1c" }}><TrendingDown size={14} /></i> Cancellation rate</div>
              <div className="val">{(data.totals.cancellationRate * 100).toFixed(1)}%</div>
              <div className="hint">no-show: {(data.totals.noShowRate * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="rep-grid">
            <div className="panel">
              <div className="panel-head"><h2>Revenue per day (completed)</h2></div>
              <div className="panel-body">
                <div className="bars">
                  {data.revenueByDay.map((d) => (
                    <div className="col" key={d.date} title={`${d.date}: ${formatFils(d.revenueFils)} · ${d.count} bookings`}>
                      <div
                        className={`bar ${d.revenueFils === 0 ? "zero" : ""}`}
                        style={{ height: `${Math.round((d.revenueFils / maxRev) * 100)}%` }}
                      />
                      <div className="lbl">{d.date.slice(8)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Top services</h2></div>
              <table className="tbl">
                <thead><tr><th>Service</th><th>Bookings</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.topServices.map((s) => (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.count}</td>
                      <td>{formatFils(s.revenueFils)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head"><h2>Staff load</h2></div>
            <table className="tbl">
              <thead><tr><th>Professional</th><th>Appointments</th><th>Booked minutes</th></tr></thead>
              <tbody>
                {data.staffLoad.map((s) => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.count}</td>
                    <td>{s.minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
// src/app/dashboard/reports/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { formatFils } from "@/lib/money";
import { CalendarDays, Wallet, Users, TrendingDown, Download } from "lucide-react";
import "../dash.css";

const extraCss = `
.rep-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
@media (max-width: 1000px) { .rep-grid { grid-template-columns: 1fr; } }
.bars { display: flex; align-items: flex-end; gap: 5px; height: 190px; padding: 14px 4px 0; }
.bars .col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; height: 100%; min-width: 0; }
.bars .bar { background: linear-gradient(180deg, #fb923c, #ea580c); border-radius: 6px 6px 0 0; min-height: 3px; }
.bars .bar.zero { background: #eeece7; }
.bars .lbl { font-size: 9px; color: #a8a29e; text-align: center; white-space: nowrap; overflow: hidden; }
.delta { display: inline-flex; align-items: center; gap: 3px; margin-left: 8px; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; vertical-align: 4px; }
.delta.up { background: #dcfce7; color: #166534; }
.delta.down { background: #fee2e2; color: #991b1b; }
.delta.flat { background: #f5f5f4; color: #78716c; }
`;

/**
 * بج مقایسه با دوره قبل.
 * invert=true برای متریک‌های "بد" مثل نرخ لغو: رشدشون قرمزه، کاهششون سبز.
 */
function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (!previous) {
    return <span className="delta flat" title="No data in the previous period">—</span>;
  }
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  const good = invert ? change <= 0 : change >= 0;
  const cls = Math.abs(change) < 0.05 ? "flat" : good ? "up" : "down";
  return (
    <span className={`delta ${cls}`} title="Change vs the previous period of equal length">
      {up ? "▲" : "▼"} {up ? "+" : ""}{change.toFixed(1)}%
    </span>
  );
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
          <p>Revenue, demand and load — with period-over-period comparison</p>
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
              <div className="val">
                {data.totals.appointments}
                <Delta current={data.totals.appointments} previous={data.previous.totals.appointments} />
              </div>
              <div className="hint">vs previous {rangeDays} days</div>
            </div>
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#eef7ee", color: "#16a34a" }}><Wallet size={14} /></i> Completed revenue</div>
              <div className="val">
                {formatFils(data.totals.completedRevenueFils)}
                <Delta current={data.totals.completedRevenueFils} previous={data.previous.totals.completedRevenueFils} />
              </div>
              <div className="hint">vs previous {rangeDays} days</div>
            </div>
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#eef2ff", color: "#4f46e5" }}><Users size={14} /></i> New customers</div>
              <div className="val">
                {data.totals.newCustomers}
                <Delta current={data.totals.newCustomers} previous={data.previous.totals.newCustomers} />
              </div>
              <div className="hint">vs previous {rangeDays} days</div>
            </div>
            <div className="kpi">
              <div className="lbl"><i style={{ background: "#fef2f2", color: "#b91c1c" }}><TrendingDown size={14} /></i> Cancellation rate</div>
              <div className="val">
                {(data.totals.cancellationRate * 100).toFixed(1)}%
                <Delta current={data.totals.cancellationRate} previous={data.previous.totals.cancellationRate} invert />
              </div>
              <div className="hint">no-show: {(data.totals.noShowRate * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="rep-grid">
            <div className="panel">
              <div className="panel-head">
                <h2>Revenue per day (completed)</h2>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    downloadCsv(`bookwise-revenue-per-day-${rangeDays}d.csv`, [
                      ["Date", "Completed revenue (AED)", "Bookings"],
                      ...data.revenueByDay.map((d) => [d.date, (d.revenueFils / 100).toFixed(2), d.count]),
                    ])
                  }
                >
                  <Download size={12} /> CSV
                </button>
              </div>
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
              <div className="panel-head">
                <h2>Top services</h2>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    downloadCsv(`bookwise-top-services-${rangeDays}d.csv`, [
                      ["Service", "Bookings", "Completed revenue (AED)"],
                      ...data.topServices.map((s) => [s.name, s.count, (s.revenueFils / 100).toFixed(2)]),
                    ])
                  }
                >
                  <Download size={12} /> CSV
                </button>
              </div>
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
            <div className="panel-head">
              <h2>Staff load</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  downloadCsv(`bookwise-staff-load-${rangeDays}d.csv`, [
                    ["Professional", "Appointments", "Booked minutes"],
                    ...data.staffLoad.map((s) => [s.name, s.count, s.minutes]),
                  ])
                }
              >
                <Download size={12} /> CSV
              </button>
            </div>
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
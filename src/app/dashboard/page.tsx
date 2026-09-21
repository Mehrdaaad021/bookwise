// src/app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { trpc } from "@/trpc/client";
import { formatFils } from "@/lib/money";
import { CalendarDays, Users, Wallet, Clock3, ArrowRight, ExternalLink } from "lucide-react";
import "./dash.css";

const STATUS_CLASS: Record<string, string> = {
  pending: "b-pending",
  confirmed: "b-confirmed",
  checked_in: "b-checked_in",
  in_progress: "b-in_progress",
  completed: "b-completed",
  cancelled: "b-cancelled",
  no_show: "b-no_show",
};

export default function OverviewPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const { data, isLoading } = trpc.workspace.getDashboard.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );

  const next = data?.upcoming?.[0];

  return (
    <div>
      <div className="dh">
        <div>
          <h1>Overview</h1>
          <p>{ws?.organization.name ?? "Loading..."} · {data?.timezone ?? ws?.organization.timezone ?? ""}</p>
        </div>
        <div className="dh-actions">
          <Link className="btn btn-ghost" href={`/book/${ws?.organization.slug ?? ""}`} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Public page
          </Link>
          <Link className="btn btn-dark" href="/dashboard/calendar">
            <CalendarDays size={14} /> Open calendar
          </Link>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="panel"><div className="empty">Loading workspace...</div></div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <div className="lbl">
                <i style={{ background: "#fef3e7", color: "#ea580c" }}><Clock3 size={14} /></i>
                Today
              </div>
              <div className="val">{data.todayCount}</div>
              <div className="hint">appointments on the books</div>
            </div>
            <div className="kpi">
              <div className="lbl">
                <i style={{ background: "#eef2ff", color: "#4f46e5" }}><Users size={14} /></i>
                Customers
              </div>
              <div className="val">{data.customerCount}</div>
              <div className="hint">unique client records</div>
            </div>
            <div className="kpi">
              <div className="lbl">
                <i style={{ background: "#eef7ee", color: "#16a34a" }}><Wallet size={14} /></i>
                Completed revenue
              </div>
              <div className="val">{formatFils(data.completedRevenueFils)}</div>
              <div className="hint">all-time, completed only</div>
            </div>
            <div className="kpi">
              <div className="lbl">
                <i style={{ background: "#f5f5f4", color: "#57534e" }}><CalendarDays size={14} /></i>
                Next up
              </div>
              <div className="val" style={{ fontSize: 15, lineHeight: 1.35, marginTop: 12 }}>
                {next ? next.whenLocal : "Nothing scheduled"}
              </div>
              <div className="hint">{next ? `${next.serviceName} · ${next.customerName}` : "the calendar is clear"}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Upcoming appointments</h2>
              <Link className="btn btn-ghost btn-sm" href="/dashboard/appointments">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {data.upcoming.length === 0 ? (
              <div className="empty">No upcoming appointments. New bookings appear here instantly.</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>When</th><th>Service</th><th>Customer</th><th>Professional</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.upcoming.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.whenLocal}</td>
                      <td>{a.serviceName}</td>
                      <td>{a.customerName}</td>
                      <td>{a.staffName}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[a.status] ?? "b-completed"}`}>
                          <i />{a.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
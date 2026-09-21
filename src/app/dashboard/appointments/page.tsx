// src/app/dashboard/appointments/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Search, X, History } from "lucide-react";
import "../dash.css";

type AppointmentStatus =
  | "pending" | "confirmed" | "checked_in" | "in_progress"
  | "completed" | "cancelled" | "no_show";

const NEXT_ACTIONS: Record<string, { next: AppointmentStatus; label: string; kind: string }[]> = {
  pending: [
    { next: "confirmed", label: "Confirm", kind: "btn-dark" },
    { next: "cancelled", label: "Cancel", kind: "btn-danger" },
  ],
  confirmed: [
    { next: "checked_in", label: "Check in", kind: "btn-dark" },
    { next: "no_show", label: "No-show", kind: "btn-ghost" },
    { next: "cancelled", label: "Cancel", kind: "btn-danger" },
  ],
  checked_in: [{ next: "in_progress", label: "Start", kind: "btn-dark" }],
  in_progress: [{ next: "completed", label: "Complete", kind: "btn-dark" }],
  completed: [],
  cancelled: [],
  no_show: [],
};

const STATUS_CLASS: Record<string, string> = {
  pending: "b-pending",
  confirmed: "b-confirmed",
  checked_in: "b-checked_in",
  in_progress: "b-in_progress",
  completed: "b-completed",
  cancelled: "b-cancelled",
  no_show: "b-no_show",
};

export default function AppointmentsPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();

  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: rows, isLoading } = trpc.workspace.listAppointments.useQuery(
    {
      organizationId: ws?.organization.id ?? "",
      status: status === "all" ? undefined : status,
      date: date || undefined,
      search: search || undefined,
    },
    { enabled: !!ws?.organization.id }
  );

  const { data: detail } = trpc.workspace.getAppointmentDetail.useQuery(
    { organizationId: ws?.organization.id ?? "", appointmentId: selectedId ?? "" },
    { enabled: !!selectedId }
  );

  const update = trpc.workspace.updateAppointmentStatus.useMutation({
    onSuccess: () => {
      utils.workspace.listAppointments.invalidate();
      utils.workspace.getDashboard.invalidate();
      utils.workspace.getAppointmentDetail.invalidate();
      utils.workspace.getCalendarAppointments.invalidate();
    },
  });

  const act = (appointmentId: string, newStatus: AppointmentStatus) => {
    if (!ws) return;
    update.mutate({ organizationId: ws.organization.id, appointmentId, newStatus });
  };

  return (
    <div>
      <div className="dh">
        <div>
          <h1>Appointments</h1>
          <p>Bookings, lifecycle actions and the forensic timeline</p>
        </div>
      </div>

      <div className="filters">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "#a8a29e" }} />
          <input
            className="input"
            style={{ paddingLeft: 32, width: "100%" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, service, staff..."
          />
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked in</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        {date && <button className="btn btn-ghost" onClick={() => setDate("")}>Clear date</button>}
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="empty">Loading appointments...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="empty">No appointments match your filters.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th><th>Service</th><th>Customer</th><th>Professional</th>
                <th>Price</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{a.whenLocal}</td>
                  <td>{a.serviceName}</td>
                  <td>{a.customerName}</td>
                  <td>{a.staffName}</td>
                  <td style={{ whiteSpace: "nowrap" }}>AED {(a.priceFils / 100).toFixed(0)}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[a.status] ?? "b-completed"}`}>
                      <i />{a.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(a.id)}>
                        <History size={12} /> Details
                      </button>
                      {(NEXT_ACTIONS[a.status] ?? []).map((action) => (
                        <button
                          key={action.next}
                          className={`btn ${action.kind} btn-sm`}
                          disabled={update.isPending}
                          onClick={() => act(a.id, action.next)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {update.isError && <div className="err-box">{update.error.message}</div>}

      {selectedId && detail && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedId(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Appointment</h2>
              <button className="drawer-x" onClick={() => setSelectedId(null)} aria-label="Close details">
                <X size={14} />
              </button>
            </div>

            <div className="drow"><span>Service</span><span>{detail.serviceName}</span></div>
            <div className="drow"><span>Professional</span><span>{detail.staffName}</span></div>
            <div className="drow"><span>Customer</span><span>{detail.customerName}</span></div>
            <div className="drow"><span>Contact</span><span>{detail.customerEmail ?? detail.customerPhone ?? "—"}</span></div>
            <div className="drow"><span>When</span><span>{detail.whenLocal}</span></div>
            <div className="drow">
              <span>Status</span>
              <span className={`badge ${STATUS_CLASS[detail.status] ?? "b-completed"}`}>
                <i />{detail.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="drow"><span>Price</span><span>AED {(detail.priceFils / 100).toFixed(0)}</span></div>
            <div className="drow"><span>Payment</span><span>{(detail.paymentStatus ?? "unknown").replace(/_/g, " ")}</span></div>

            {detail.customerNotes && (
              <div className="dsec">
                <h3>Customer notes</h3>
                <div className="note-box">{detail.customerNotes}</div>
              </div>
            )}
            {detail.cancellationReason && (
              <div className="dsec">
                <h3>Cancellation reason</h3>
                <div className="note-box red">{detail.cancellationReason}</div>
              </div>
            )}

            <div className="dsec">
              <h3>Status timeline</h3>
              <div>
                {detail.history.map((h, i) => (
                  <div key={h.id} className="tl-item">
                    <div className="tl-rail">
                      <div className={`tl-dot ${i === detail.history.length - 1 ? "on" : ""}`} />
                      {i < detail.history.length - 1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-body">
                      <b>
                        {h.fromStatus ? `${h.fromStatus.replace(/_/g, " ")} → ` : ""}
                        {h.toStatus.replace(/_/g, " ")}
                      </b>
                      <span>
                        {h.atLocal} · by {h.changedBy === "customer" ? "customer" : h.changedBy === "system" ? "system" : "staff"}
                        {h.reason ? ` · ${h.reason}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
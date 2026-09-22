// src/app/dashboard/customers/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { formatFils } from "@/lib/money";
import { Search, X, CalendarClock, Wallet, TrendingDown, UserCheck, AlertCircle, Mail, Phone as PhoneIcon } from "lucide-react";
import "../dash.css";

const extraCss = `
.cstat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 4px; }
.cstat .kpi { padding: 12px; }
.cstat .kpi .lbl { font-size: 10.5px; }
.cstat .kpi .lbl i { width: 22px; height: 22px; }
.cstat .kpi .val { font-size: 20px; margin-top: 6px; }
.histrow { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed #f0eee9; font-size: 13px; }
.histrow:last-child { border-bottom: none; }
.histrow .when { width: 120px; flex-shrink: 0; font-weight: 600; color: #44403c; font-size: 12px; }
.histrow .svc { flex: 1; min-width: 0; }
.histrow .svc b { display: block; font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.histrow .svc span { font-size: 11.5px; color: #78716c; }
.histrow .price { font-size: 12.5px; font-weight: 700; color: #44403c; white-space: nowrap; }
.contact-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #faf9f6; border: 1px solid #e8e5df; border-radius: 8px; font-size: 12px; color: #44403c; margin-right: 6px; }
.rate-bar { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; font-size: 11.5px; }
.rate-bar .rate { padding: 3px 9px; border-radius: 6px; font-weight: 600; }
.r-ok { background: #eef7ee; color: #166534; }
.r-warn { background: #fef3c7; color: #92400e; }
.r-bad { background: #fee2e2; color: #991b1b; }
.empty-cust { text-align: center; padding: 22px; color: #a8a29e; font-size: 13px; }
`;

const STATUS_CLASS: Record<string, string> = {
  pending: "b-pending",
  confirmed: "b-confirmed",
  checked_in: "b-checked_in",
  in_progress: "b-in_progress",
  completed: "b-completed",
  cancelled: "b-cancelled",
  no_show: "b-no_show",
};

type CustRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowCount: number;
  totalSpentFils: number;
  lastAppointmentAt: string | null;
  consentGiven: boolean;
};

export default function CustomersPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const orgId = ws?.organization.id ?? "";
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: rows, isLoading } = trpc.customers.listCustomers.useQuery(
    { organizationId: orgId, search: search || undefined },
    { enabled: !!orgId }
  );

  const { data: detail } = trpc.customers.getCustomerDetail.useQuery(
    { organizationId: orgId, customerId: selectedId ?? "" },
    { enabled: !!selectedId && !!orgId }
  );

  return (
    <div>
      <style>{extraCss}</style>
      <div className="dh">
        <div>
          <h1>Customers</h1>
          <p>Client records, lifetime stats and appointment history</p>
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
            placeholder="Search by name, email or phone..."
          />
        </div>
        <div style={{ fontSize: 12.5, color: "#78716c" }}>
          {rows?.length ?? 0} customers shown
        </div>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="empty">Loading customers...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="empty">
            {search ? "No customers match your search." : "No customers yet — they appear after the first booking."}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Appointments</th>
                <th>Lifetime value</th>
                <th>Last visit</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      {c.consentGiven && <UserCheck size={13} color="#16a34a" />}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "#57534e" }}>
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div style={{ color: "#a8a29e" }}>{c.phone}</div>}
                    {!c.email && !c.phone && <span style={{ color: "#c9c5bc" }}>—</span>}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <b>{c.completedAppointments}</b>
                    <span style={{ color: "#a8a29e", marginLeft: 4 }}>of {c.totalAppointments}</span>
                  </td>
                  <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{formatFils(c.totalSpentFils)}</td>
                  <td style={{ fontSize: 12, color: "#78716c", whiteSpace: "nowrap" }}>
                    {c.lastAppointmentAt ? new Date(c.lastAppointmentAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(c.id)}>
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && detail && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedId(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>{detail.customer.name}</h2>
              <button className="drawer-x" onClick={() => setSelectedId(null)} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            {(detail.customer.email || detail.customer.phone) && (
              <div style={{ marginBottom: 14 }}>
                {detail.customer.email && (
                  <span className="contact-chip"><Mail size={12} /> {detail.customer.email}</span>
                )}
                {detail.customer.phone && (
                  <span className="contact-chip"><PhoneIcon size={12} /> {detail.customer.phone}</span>
                )}
              </div>
            )}

            {detail.customer.consentGiven ? (
              <div style={{ fontSize: 11.5, color: "#16a34a", marginBottom: 14, display: "flex", gap: 6, alignItems: "center" }}>
                <UserCheck size={13} /> Consent given for booking
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: "#a16207", marginBottom: 14, display: "flex", gap: 6, alignItems: "center" }}>
                <AlertCircle size={13} /> No consent on record
              </div>
            )}

            <div className="cstat">
              <div className="kpi">
                <div className="lbl"><i style={{ background: "#eef7ee", color: "#16a34a" }}><CalendarClock size={13} /></i> Completed</div>
                <div className="val">{detail.customer.completedAppointments}</div>
              </div>
              <div className="kpi">
                <div className="lbl"><i style={{ background: "#fef2f2", color: "#b91c1c" }}><TrendingDown size={13} /></i> Cancelled</div>
                <div className="val">{detail.customer.cancelledAppointments}</div>
              </div>
              <div className="kpi">
                <div className="lbl"><i style={{ background: "#f5f5f4", color: "#78716c" }}><AlertCircle size={13} /></i> No-show</div>
                <div className="val">{detail.customer.noShowCount}</div>
              </div>
              <div className="kpi">
                <div className="lbl"><i style={{ background: "#fef3e7", color: "#ea580c" }}><Wallet size={13} /></i> LTV</div>
                <div className="val" style={{ fontSize: 16 }}>{formatFils(detail.customer.totalSpentFils)}</div>
              </div>
            </div>

            <div className="rate-bar">
              <span className="rate r-ok">
                Completion: {detail.customer.totalAppointments
                  ? Math.round((detail.customer.completedAppointments / detail.customer.totalAppointments) * 100)
                  : 0}%
              </span>
              {detail.customer.cancelledAppointments > 0 && (
                <span className="rate r-warn">
                  Cancel: {Math.round((detail.customer.cancelledAppointments / detail.customer.totalAppointments) * 100)}%
                </span>
              )}
              {detail.customer.noShowCount > 0 && (
                <span className="rate r-bad">
                  No-show: {Math.round((detail.customer.noShowCount / detail.customer.totalAppointments) * 100)}%
                </span>
              )}
            </div>

            {detail.customer.notes && (
              <div className="dsec">
                <h3>Notes</h3>
                <div className="note-box">{detail.customer.notes}</div>
              </div>
            )}

            <div className="dsec">
              <h3>Appointment history</h3>
              {detail.history.length === 0 ? (
                <div className="empty-cust">No appointments yet.</div>
              ) : (
                detail.history.map((h) => (
                  <div className="histrow" key={h.id}>
                    <div className="when">{h.whenLocal}</div>
                    <div className="svc">
                      <b>{h.serviceName}</b>
                      <span>{h.staffName}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className={`badge ${STATUS_CLASS[h.status] ?? "b-completed"}`}>
                        <i />{h.status.replace(/_/g, " ")}
                      </span>
                      <span className="price">{formatFils(h.priceFils)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
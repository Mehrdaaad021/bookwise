// src/app/dashboard/audit/page.tsx
"use client";

import { Fragment, useState } from "react";
import { trpc } from "@/trpc/client";
import { ScrollText, ChevronDown, ChevronRight, Filter } from "lucide-react";
import "../dash.css";

const extraCss = `
.aud-tbl td.cell-action { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
.aud-chip { display: inline-flex; padding: 2px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .02em; }
.aud-chip.appointment { background: #dbeafe; color: #1e40af; }
.aud-chip.settings { background: #fef3c7; color: #92400e; }
.aud-chip.service { background: #dcfce7; color: #166534; }
.aud-chip.staff { background: #ede9fe; color: #5b21b6; }
.aud-chip.availability { background: #fed7aa; color: #9a3412; }
.aud-chip.other { background: #f5f5f4; color: #57534e; }
.aud-row { cursor: pointer; }
.aud-row:hover td { background: #faf9f6; }
.aud-meta { padding: 12px 18px 16px; background: #faf9f6; font-size: 11.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #44403c; line-height: 1.55; word-break: break-word; }
.aud-meta pre { white-space: pre-wrap; margin: 0; }
.aud-meta-row { display: flex; gap: 10px; margin-bottom: 4px; }
.aud-meta-row b { width: 80px; flex-shrink: 0; color: #78716c; font-weight: 600; }
`;

function categoryFor(action: string): string {
  if (action.startsWith("appointment")) return "appointment";
  if (action.startsWith("settings")) return "settings";
  if (action.startsWith("service")) return "service";
  if (action.startsWith("staff")) return "staff";
  if (action.startsWith("availability")) return "availability";
  return "other";
}

export default function AuditPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const orgId = ws?.organization.id ?? "";
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: rows, isLoading, error } = trpc.audit.listAuditLogs.useQuery(
    { organizationId: orgId, limit: 100 },
    { enabled: !!orgId }
  );

  const filtered = (rows ?? []).filter((r) => filter === "all" || categoryFor(r.action) === filter);

  return (
    <div>
      <style>{extraCss}</style>
      <div className="dh">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ScrollText size={20} style={{ color: "#ea580c" }} />
            Audit Log
          </h1>
          <p>Forensic trail of sensitive mutations · owner-only view</p>
        </div>
        <div className="dh-actions">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} color="#78716c" />
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All categories</option>
              <option value="appointment">Appointments</option>
              <option value="settings">Settings</option>
              <option value="service">Services</option>
              <option value="staff">Staff</option>
              <option value="availability">Availability</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="empty">Loading audit trail...</div>
        ) : error ? (
          <div className="err-box">{error.message}</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {filter === "all"
              ? "No audit entries yet. Every sensitive change lands here."
              : `No entries in the "${filter}" category.`}
          </div>
        ) : (
          <table className="tbl aud-tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th style={{ textAlign: "right" }}>ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isOpen = expanded === r.id;
                const cat = categoryFor(r.action);
                return (
                  <Fragment key={r.id}>
                    <tr
                      className="aud-row"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                    >
                      <td>
                        {isOpen ? <ChevronDown size={14} color="#78716c" /> : <ChevronRight size={14} color="#a8a29e" />}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#57534e" }}>{r.atLocal}</td>
                      <td style={{ fontWeight: 600 }}>{r.actorName}</td>
                      <td className="cell-action">
                        <span className={`aud-chip ${cat}`}>{r.action}</span>
                      </td>
                      <td style={{ fontSize: 12, color: "#57534e" }}>{r.entityType ?? "—"}</td>
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace", fontSize: 11, color: "#a8a29e" }}>
                        {r.entityId ? `#${r.entityId.slice(0, 8)}` : "—"}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div className="aud-meta">
                            <div className="aud-meta-row"><b>Action</b><span>{r.action}</span></div>
                            <div className="aud-meta-row"><b>Entity</b><span>{r.entityType ?? "—"}{r.entityId ? ` · #${r.entityId}` : ""}</span></div>
                            <div className="aud-meta-row"><b>Actor</b><span>{r.actorName}</span></div>
                            <div className="aud-meta-row">
                              <b>Details</b>
                              <pre>{r.meta ? JSON.stringify(r.meta, null, 2) : "No additional details recorded."}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
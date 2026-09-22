// src/app/dashboard/services/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Plus, Pencil, Eye, EyeOff, Archive } from "lucide-react";
import "../dash.css";

const extraCss = `
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fgrid .full { grid-column: 1 / -1; }
.chk { display: flex; gap: 8px; align-items: center; font-size: 13px; color: #44403c; }
.chklist { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 10px 12px; background: #faf9f6; border: 1px solid #e8e5df; border-radius: 10px; }
.chipmini { display: inline-flex; padding: 2px 8px; border-radius: 999px; background: #f5f4f0; border: 1px solid #e8e5df; font-size: 10.5px; font-weight: 600; color: #57534e; margin: 0 4px 4px 0; }
`;

type ServiceRow = {
  id: string; name: string; shortDescription: string | null;
  durationMinutes: number; priceFils: number;
  bufferBeforeMinutes: number; bufferAfterMinutes: number;
  isActive: boolean; isArchived: boolean;
  staff: { id: string; name: string }[];
};

export default function ServicesPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();
  const orgId = ws?.organization.id ?? "";

  const { data: rows, isLoading } = trpc.services.listAdminServices.useQuery(
    { organizationId: orgId }, { enabled: !!orgId }
  );
  const { data: staffOptions } = trpc.services.listStaffOptions.useQuery(
    { organizationId: orgId }, { enabled: !!orgId }
  );

  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);

  const refresh = () => utils.services.listAdminServices.invalidate();
  const update = trpc.services.updateService.useMutation({ onSuccess: refresh });

  return (
    <div>
      <style>{extraCss}</style>
      <div className="dh">
        <div>
          <h1>Services</h1>
          <p>Catalog, pricing, buffers and staff eligibility</p>
        </div>
        <div className="dh-actions">
          <button className="btn btn-dark" onClick={() => setEditing("new")}>
            <Plus size={14} /> New service
          </button>
        </div>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="empty">Loading services...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="empty">No services yet. Create the first one.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Service</th><th>Duration</th><th>Price</th><th>Buffers</th><th>Eligible staff</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: "#a8a29e" }}>{s.shortDescription ?? "—"}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{s.durationMinutes} min</td>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>AED {(s.priceFils / 100).toFixed(0)}</td>
                  <td style={{ fontSize: 11.5, color: "#78716c", whiteSpace: "nowrap" }}>
                    {s.bufferBeforeMinutes}m before · {s.bufferAfterMinutes}m after
                  </td>
                  <td>
                    {s.staff.length === 0 ? <span style={{ color: "#a8a29e" }}>—</span> :
                      s.staff.map((p) => <span key={p.id} className="chipmini">{p.name}</span>)}
                  </td>
                  <td>
                    {s.isArchived ? (
                      <span className="badge b-no_show"><i />archived</span>
                    ) : s.isActive ? (
                      <span className="badge b-confirmed"><i />live</span>
                    ) : (
                      <span className="badge b-pending"><i />hidden</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(s)}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={update.isPending || s.isArchived}
                        onClick={() => update.mutate({ organizationId: orgId, serviceId: s.id, isActive: !s.isActive })}
                      >
                        {s.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                        {s.isActive ? "Hide" : "Show"}
                      </button>
                      {!s.isArchived && (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ organizationId: orgId, serviceId: s.id, isArchived: true })}
                        >
                          <Archive size={12} /> Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ServiceDrawer
          key={editing === "new" ? "new" : editing.id}
          orgId={orgId}
          initial={editing}
          staffOptions={staffOptions ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ServiceDrawer({ orgId, initial, staffOptions, onClose, onSaved }: {
  orgId: string;
  initial: ServiceRow | "new";
  staffOptions: { id: string; name: string; isActive: boolean }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = initial === "new";
  const base = isNew ? null : initial;

  const [name, setName] = useState(base?.name ?? "");
  const [shortDescription, setShortDescription] = useState(base?.shortDescription ?? "");
  const [duration, setDuration] = useState(String(base?.durationMinutes ?? 30));
  const [priceAed, setPriceAed] = useState(String(base ? base.priceFils / 100 : 0));
  const [bufBefore, setBufBefore] = useState(String(base?.bufferBeforeMinutes ?? 0));
  const [bufAfter, setBufAfter] = useState(String(base?.bufferAfterMinutes ?? 0));
  const [isActive, setIsActive] = useState(base?.isActive ?? true);
  const [staffIds, setStaffIds] = useState<string[]>(base?.staff.map((s) => s.id) ?? []);

  const create = trpc.services.createService.useMutation({ onSuccess: onSaved });
  const update = trpc.services.updateService.useMutation({ onSuccess: onSaved });

  const toggleStaff = (id: string) =>
    setStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    const payload = {
      name,
      shortDescription: shortDescription || undefined,
      durationMinutes: Number(duration),
      priceFils: Math.round(Number(priceAed) * 100),
      bufferBeforeMinutes: Number(bufBefore),
      bufferAfterMinutes: Number(bufAfter),
      isActive,
      staffIds,
    };
    if (isNew) {
      create.mutate({ organizationId: orgId, ...payload });
    } else {
      update.mutate({ organizationId: orgId, serviceId: (initial as ServiceRow).id, ...payload });
    }
  };

  const busy = create.isPending || update.isPending;
  const err = create.error ?? update.error;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>{isNew ? "New service" : "Edit service"}</h2>
          <button className="drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="fgrid">
          <div className="field full">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Signature Facial" />
          </div>
          <div className="field full">
            <label>Short description</label>
            <input className="input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Deep cleansing with premium products" />
          </div>
          <div className="field">
            <label>Duration (min)</label>
            <input className="input" type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="field">
            <label>Price (AED)</label>
            <input className="input" type="number" min={0} step={5} value={priceAed} onChange={(e) => setPriceAed(e.target.value)} />
          </div>
          <div className="field">
            <label>Buffer before (min)</label>
            <input className="input" type="number" min={0} step={5} value={bufBefore} onChange={(e) => setBufBefore(e.target.value)} />
          </div>
          <div className="field">
            <label>Buffer after (min)</label>
            <input className="input" type="number" min={0} step={5} value={bufAfter} onChange={(e) => setBufAfter(e.target.value)} />
          </div>
          <div className="field full">
            <label>Eligible professionals</label>
            <div className="chklist">
              {staffOptions.length === 0 && <span style={{ fontSize: 12, color: "#a8a29e" }}>No staff yet</span>}
              {staffOptions.map((s) => (
                <label key={s.id} className="chk">
                  <input type="checkbox" checked={staffIds.includes(s.id)} onChange={() => toggleStaff(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <label className="chk full">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Visible on the public booking page
          </label>
        </div>

        {err && <div className="err-box">{err.message}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button className="btn btn-dark" style={{ flex: 1, justifyContent: "center" }} disabled={busy || !name} onClick={submit}>
            {busy ? "Saving..." : isNew ? "Create service" : "Save changes"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </aside>
    </>
  );
}
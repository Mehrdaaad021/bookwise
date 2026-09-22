// src/app/dashboard/staff/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Plus, Pencil } from "lucide-react";
import "../dash.css";

const extraCss = `
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fgrid .full { grid-column: 1 / -1; }
.chk { display: flex; gap: 8px; align-items: center; font-size: 13px; color: #44403c; }
.chklist { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 10px 12px; background: #faf9f6; border: 1px solid #e8e5df; border-radius: 10px; }
.chipmini { display: inline-flex; padding: 2px 8px; border-radius: 999px; background: #f5f4f0; border: 1px solid #e8e5df; font-size: 10.5px; font-weight: 600; color: #57534e; margin: 0 4px 4px 0; }
`;

type StaffRow = {
  id: string; name: string; role: string | null; bio: string | null;
  email: string | null; phone: string | null; isActive: boolean;
  services: { id: string; name: string }[];
};

export default function StaffPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();
  const orgId = ws?.organization.id ?? "";

  const { data: rows, isLoading } = trpc.staff.listAdminStaff.useQuery(
    { organizationId: orgId }, { enabled: !!orgId }
  );
  const { data: serviceOptions } = trpc.staff.listServiceOptions.useQuery(
    { organizationId: orgId }, { enabled: !!orgId }
  );

  const [editing, setEditing] = useState<StaffRow | "new" | null>(null);
  const refresh = () => utils.staff.listAdminStaff.invalidate();
  const update = trpc.staff.updateStaff.useMutation({ onSuccess: refresh });

  return (
    <div>
      <style>{extraCss}</style>
      <div className="dh">
        <div>
          <h1>Staff</h1>
          <p>Professionals, roles and the services they can perform</p>
        </div>
        <div className="dh-actions">
          <button className="btn btn-dark" onClick={() => setEditing("new")}>
            <Plus size={14} /> New professional
          </button>
        </div>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="empty">Loading staff...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="empty">No professionals yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Professional</th><th>Contact</th><th>Services</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: "#a8a29e" }}>{s.role ?? "—"}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div>{s.email ?? "—"}</div>
                    <div style={{ color: "#a8a29e" }}>{s.phone ?? ""}</div>
                  </td>
                  <td>
                    {s.services.length === 0 ? <span style={{ color: "#a8a29e" }}>—</span> :
                      s.services.map((v) => <span key={v.id} className="chipmini">{v.name}</span>)}
                  </td>
                  <td>
                    {s.isActive ? (
                      <span className="badge b-confirmed"><i />active</span>
                    ) : (
                      <span className="badge b-no_show"><i />inactive</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(s)}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ organizationId: orgId, staffId: s.id, isActive: !s.isActive })}
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <StaffDrawer
          key={editing === "new" ? "new" : editing.id}
          orgId={orgId}
          initial={editing}
          serviceOptions={serviceOptions ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function StaffDrawer({ orgId, initial, serviceOptions, onClose, onSaved }: {
  orgId: string;
  initial: StaffRow | "new";
  serviceOptions: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = initial === "new";
  const base = isNew ? null : initial;

  const [name, setName] = useState(base?.name ?? "");
  const [role, setRole] = useState(base?.role ?? "");
  const [email, setEmail] = useState(base?.email ?? "");
  const [phone, setPhone] = useState(base?.phone ?? "");
  const [isActive, setIsActive] = useState(base?.isActive ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(base?.services.map((s) => s.id) ?? []);

  const create = trpc.staff.createStaff.useMutation({ onSuccess: onSaved });
  const update = trpc.staff.updateStaff.useMutation({ onSuccess: onSaved });

  const toggleService = (id: string) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (isNew) {
      create.mutate({
        organizationId: orgId,
        name,
        role: role || undefined,
        email: email || undefined,
        phone: phone || undefined,
        serviceIds,
      });
    } else {
      update.mutate({
        organizationId: orgId,
        staffId: (initial as StaffRow).id,
        name,
        role: role || undefined,
        isActive,
        serviceIds,
      });
    }
  };

  const busy = create.isPending || update.isPending;
  const err = create.error ?? update.error;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>{isNew ? "New professional" : "Edit professional"}</h2>
          <button className="drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="fgrid">
          <div className="field full">
            <label>Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nour Ali" />
          </div>
          <div className="field">
            <label>Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior stylist" />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field full">
            <label>Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 ..." />
          </div>
          <div className="field full">
            <label>Can perform</label>
            <div className="chklist">
              {serviceOptions.length === 0 && <span style={{ fontSize: 12, color: "#a8a29e" }}>No services yet</span>}
              {serviceOptions.map((s) => (
                <label key={s.id} className="chk">
                  <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          {!isNew && (
            <label className="chk full">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (visible for booking)
            </label>
          )}
        </div>

        {err && <div className="err-box">{err.message}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button className="btn btn-dark" style={{ flex: 1, justifyContent: "center" }} disabled={busy || !name} onClick={submit}>
            {busy ? "Saving..." : isNew ? "Create" : "Save changes"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </aside>
    </>
  );
}
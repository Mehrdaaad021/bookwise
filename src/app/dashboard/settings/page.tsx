// src/app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Settings as SettingsIcon, AlertTriangle, Shield, Clock, FileText } from "lucide-react";
import "../dash.css";

const extraCss = `
.sec-panel { margin-bottom: 14px; }
.sec-panel-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #f0eee9; }
.sec-panel-head .ic { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sec-panel-head h2 { font-size: 14.5px; font-weight: 700; }
.sec-panel-head p { font-size: 12px; color: #78716c; margin-top: 2px; }
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; }
.fgrid .full { grid-column: 1 / -1; }
.chk { display: flex; gap: 8px; align-items: center; font-size: 13px; color: #44403c; padding: 10px 18px; border-top: 1px solid #f5f4f0; }
.closed-banner { margin: 14px 18px 18px; padding: 12px 14px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; display: flex; gap: 8px; align-items: center; }
.saved-toast { position: fixed; bottom: 22px; right: 22px; padding: 10px 16px; border-radius: 10px; background: #16a34a; color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(22, 163, 74, .3); z-index: 50; }
`;

type SettingsData = {
  organization: {
    name: string;
    timezone: string;
    currency: string;
    settings: {
      slotInterval?: number;
      minimumNoticeMinutes?: number;
      maxBookingDaysAhead?: number;
      isTemporarilyClosed?: boolean;
      taxRatePercent?: number;
      allowStaffSelection?: boolean;
    };
  };
  policy: {
    cancellationWindowHours: number;
    rescheduleWindowHours: number;
    autoConfirmBookings: boolean;
    privacyNotice: string | null;
    bookingTerms: string | null;
  } | null;
};

export default function SettingsPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const orgId = ws?.organization.id ?? "";

  const { data, isLoading, error } = trpc.settings.getSettings.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  if (isLoading) return <div className="panel"><div className="empty">Loading settings...</div></div>;

  // 🎯 حالت خطا: staff (و هر role غیرمجاز) یه پیام Access denied میبینه
  if (error) {
    return (
      <div>
        <div className="dh">
          <div>
            <h1>Settings</h1>
            <p>Access control</p>
          </div>
        </div>
        <div className="err-box">
          <b>Access denied.</b> You do not have permission to view settings.
          Only owners and managers can access this page.
        </div>
      </div>
    );
  }

  if (!data) return null;
  return <SettingsForm orgId={orgId} initial={data} orgMeta={ws?.organization} />;
}

function SettingsForm({ orgId, initial, orgMeta }: { orgId: string; initial: SettingsData; orgMeta: { id: string; name: string; timezone: string; currency: string; isDemo?: boolean } | undefined }) {
  const utils = trpc.useUtils();
  const s = initial.organization.settings;

  const [slotInterval, setSlotInterval] = useState(String(s.slotInterval ?? 30));
  const [minimumNotice, setMinimumNotice] = useState(String(s.minimumNoticeMinutes ?? 60));
  const [maxDaysAhead, setMaxDaysAhead] = useState(String(s.maxBookingDaysAhead ?? 30));
  const [taxRate, setTaxRate] = useState(String(s.taxRatePercent ?? 0));
  const [allowStaffSelection, setAllowStaffSelection] = useState(s.allowStaffSelection ?? true);
  const [tempClosed, setTempClosed] = useState(s.isTemporarilyClosed ?? false);

  const [cancelWindow, setCancelWindow] = useState(String(initial.policy?.cancellationWindowHours ?? 24));
  const [rescheduleWindow, setRescheduleWindow] = useState(String(initial.policy?.rescheduleWindowHours ?? 24));
  const [autoConfirm, setAutoConfirm] = useState(initial.policy?.autoConfirmBookings ?? true);
  const [privacyNotice, setPrivacyNotice] = useState(initial.policy?.privacyNotice ?? "");
  const [bookingTerms, setBookingTerms] = useState(initial.policy?.bookingTerms ?? "");

  const [saved, setSaved] = useState(false);

  const update = trpc.settings.updateSettings.useMutation({
    onSuccess: () => {
      utils.settings.getSettings.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const save = () => {
    update.mutate({
      organizationId: orgId,
      settings: {
        slotInterval: Number(slotInterval),
        minimumNoticeMinutes: Number(minimumNotice),
        maxBookingDaysAhead: Number(maxDaysAhead),
        taxRatePercent: Number(taxRate),
        allowStaffSelection,
        isTemporarilyClosed: tempClosed,
      },
      policy: {
        cancellationWindowHours: Number(cancelWindow),
        rescheduleWindowHours: Number(rescheduleWindow),
        autoConfirmBookings: autoConfirm,
        privacyNotice: privacyNotice || undefined,
        bookingTerms: bookingTerms || undefined,
      },
    });
  };

  return (
    <div>
      <style>{extraCss}</style>

      <div className="dh">
        <div>
          <h1>Settings</h1>
          <p>{initial.organization.name} · {orgMeta?.timezone} · {orgMeta?.currency}</p>
        </div>
        <div className="dh-actions">
          <button className="btn btn-dark" disabled={update.isPending} onClick={save}>
            {update.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {update.isError && <div className="err-box">{update.error.message}</div>}

      {tempClosed && (
        <div className="closed-banner">
          <AlertTriangle size={15} />
          Temporary closure is <b>ON</b>. The public booking page currently rejects all new bookings.
        </div>
      )}

      <div className="panel sec-panel">
        <div className="sec-panel-head">
          <span className="ic" style={{ background: "#fef3e7", color: "#ea580c" }}><Clock size={15} /></span>
          <div>
            <h2>Booking engine</h2>
            <p>How availability is generated and what customers can choose</p>
          </div>
        </div>
        <div className="fgrid">
          <div className="field">
            <label>Slot interval (minutes)</label>
            <select className="select" value={slotInterval} onChange={(e) => setSlotInterval(e.target.value)}>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
          <div className="field">
            <label>Minimum notice (minutes)</label>
            <input type="number" min={0} step={15} className="input" value={minimumNotice} onChange={(e) => setMinimumNotice(e.target.value)} />
          </div>
          <div className="field">
            <label>Max booking window (days ahead)</label>
            <input type="number" min={1} max={365} className="input" value={maxDaysAhead} onChange={(e) => setMaxDaysAhead(e.target.value)} />
          </div>
          <div className="field">
            <label>Tax rate (%)</label>
            <input type="number" min={0} max={100} className="input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
        </div>
        <label className="chk">
          <input type="checkbox" checked={allowStaffSelection} onChange={(e) => setAllowStaffSelection(e.target.checked)} />
          Let customers pick a specific professional (off = server assigns)
        </label>
      </div>

      <div className="panel sec-panel">
        <div className="sec-panel-head">
          <span className="ic" style={{ background: "#eef2ff", color: "#4f46e5" }}><FileText size={15} /></span>
          <div>
            <h2>Policies</h2>
            <p>Cancellation, reschedule windows and public legal copy</p>
          </div>
        </div>
        <div className="fgrid">
          <div className="field">
            <label>Cancellation window (hours before)</label>
            <input type="number" min={0} max={720} className="input" value={cancelWindow} onChange={(e) => setCancelWindow(e.target.value)} />
          </div>
          <div className="field">
            <label>Reschedule window (hours before)</label>
            <input type="number" min={0} max={720} className="input" value={rescheduleWindow} onChange={(e) => setRescheduleWindow(e.target.value)} />
          </div>
          <div className="field full">
            <label>Privacy notice (shown on checkout)</label>
            <textarea rows={3} className="input" style={{ resize: "vertical" }} value={privacyNotice} onChange={(e) => setPrivacyNotice(e.target.value)} placeholder="We only use your details to manage your bookings..." />
          </div>
          <div className="field full">
            <label>Booking terms (shown on checkout)</label>
            <textarea rows={3} className="input" style={{ resize: "vertical" }} value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} placeholder="Late arrivals may shorten your appointment..." />
          </div>
        </div>
        <label className="chk">
          <input type="checkbox" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} />
          Auto-confirm new bookings (off = start as <code>pending</code>)
        </label>
      </div>

      <div className="panel sec-panel" style={{ borderColor: tempClosed ? "#fecaca" : undefined }}>
        <div className="sec-panel-head">
          <span className="ic" style={{ background: tempClosed ? "#fee2e2" : "#f5f5f4", color: tempClosed ? "#b91c1c" : "#57534e" }}>
            <Shield size={15} />
          </span>
          <div>
            <h2>Temporary closure</h2>
            <p>Emergency switch — blocks all new bookings immediately</p>
          </div>
        </div>
        <label className="chk">
          <input type="checkbox" checked={tempClosed} onChange={(e) => setTempClosed(e.target.checked)} />
          Pause all new bookings from the public page
        </label>
      </div>

      {saved && <div className="saved-toast">✓ Settings saved</div>}
    </div>
  );
}
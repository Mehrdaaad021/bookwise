// src/app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
  const { data, isLoading } = trpc.settings.getSettings.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );

  if (isLoading || !data) {
    return <div className="p-8 text-center text-stone-500">Loading settings...</div>;
  }

  return <SettingsForm organizationId={ws!.organization.id} initial={data} />;
}

function SettingsForm({ organizationId, initial }: { organizationId: string; initial: SettingsData }) {
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
      organizationId,
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
        privacyNotice,
        bookingTerms,
      },
    });
  };

  const inputCls = "w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Settings</h1>
          <p className="text-sm text-stone-500">
            {initial.organization.name} · {initial.organization.timezone} · {initial.organization.currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600 font-medium">✅ Saved</span>}
          <Button onClick={save} disabled={update.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white">
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {update.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{update.error.message}</div>
      )}

      <Card className="shadow-sm border-stone-200">
        <CardHeader><CardTitle className="text-base">Booking engine</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-700">Slot interval (minutes)</label>
            <select value={slotInterval} onChange={(e) => setSlotInterval(e.target.value)} className={inputCls}>
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Minimum notice (minutes)</label>
            <input type="number" min={0} step={15} value={minimumNotice} onChange={(e) => setMinimumNotice(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Max booking window (days)</label>
            <input type="number" min={1} max={365} value={maxDaysAhead} onChange={(e) => setMaxDaysAhead(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Tax rate (%)</label>
            <input type="number" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
            <input type="checkbox" checked={allowStaffSelection} onChange={(e) => setAllowStaffSelection(e.target.checked)} className="rounded border-stone-300" />
            Customers can choose a specific professional
          </label>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-stone-200">
        <CardHeader><CardTitle className="text-base">Policies</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-700">Cancellation window (hours)</label>
            <input type="number" min={0} max={720} value={cancelWindow} onChange={(e) => setCancelWindow(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Reschedule window (hours)</label>
            <input type="number" min={0} max={720} value={rescheduleWindow} onChange={(e) => setRescheduleWindow(e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} className="rounded border-stone-300" />
            Auto-confirm new bookings
          </label>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-stone-700">Privacy notice</label>
            <textarea rows={2} value={privacyNotice} onChange={(e) => setPrivacyNotice(e.target.value)} className={inputCls + " resize-none"} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-stone-700">Booking terms</label>
            <textarea rows={2} value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} className={inputCls + " resize-none"} />
          </div>
        </CardContent>
      </Card>

      <Card className={`shadow-sm ${tempClosed ? "border-red-300" : "border-stone-200"}`}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${tempClosed ? "text-red-500" : "text-stone-400"}`} />
            Temporary closure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={tempClosed} onChange={(e) => setTempClosed(e.target.checked)} className="rounded border-stone-300" />
            Pause all new bookings (public page shows a closed notice)
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
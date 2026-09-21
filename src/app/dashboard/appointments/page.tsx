// src/app/dashboard/appointments/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, X, History } from "lucide-react";

type AppointmentStatus =
  | "pending" | "confirmed" | "checked_in" | "in_progress"
  | "completed" | "cancelled" | "no_show";

// Keys are strings because the API returns status as a plain string column
const NEXT_ACTIONS: Record<string, { next: AppointmentStatus; label: string; tone: string }[]> = {
  pending: [
    { next: "confirmed", label: "Confirm", tone: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
    { next: "cancelled", label: "Cancel", tone: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" },
  ],
  confirmed: [
    { next: "checked_in", label: "Check in", tone: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
    { next: "no_show", label: "No-show", tone: "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100" },
    { next: "cancelled", label: "Cancel", tone: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" },
  ],
  checked_in: [{ next: "in_progress", label: "Start", tone: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" }],
  in_progress: [{ next: "completed", label: "Complete", tone: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" }],
  completed: [],
  cancelled: [],
  no_show: [],
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  checked_in: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-stone-200 text-stone-700",
  cancelled: "bg-red-100 text-red-600",
  no_show: "bg-stone-200 text-stone-500",
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
    },
  });

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    if (!ws) return;
    update.mutate({
      organizationId: ws.organization.id,
      appointmentId,
      newStatus,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Appointments</h1>
        <p className="text-sm text-stone-500">Manage bookings, statuses, and daily flow</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, service, staff..."
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none bg-white"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked in</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No-show</option>
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-300"
        />
        {date && <Button variant="outline" size="sm" onClick={() => setDate("")}>Clear date</Button>}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-stone-500">Loading appointments...</CardContent></Card>
      ) : !rows || rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-stone-500">No appointments match your filters.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <Card key={a.id} className="shadow-sm border-stone-200">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-800">{a.serviceName} — {a.customerName}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {a.staffName} · {a.whenLocal} · AED {(a.priceFils / 100).toFixed(0)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[a.status] ?? "bg-stone-100 text-stone-600"}`}>
                    {a.status.replace(/_/g, " ")}
                  </span>
                  <button
                    onClick={() => setSelectedId(a.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 flex items-center gap-1">
                    <History className="w-3 h-3" /> Details
                  </button>
                  {(NEXT_ACTIONS[a.status] ?? []).map((action) => (
                    <button
                      key={action.next}
                      disabled={update.isPending}
                      onClick={() => handleStatusChange(a.id, action.next)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${action.tone}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {update.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {update.error.message}
        </div>
      )}

      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-800">Appointment</h2>
              <button onClick={() => setSelectedId(null)} aria-label="Close details"
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Service</span><span className="font-medium">{detail.serviceName}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Professional</span><span>{detail.staffName}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Customer</span><span>{detail.customerName}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Contact</span><span className="text-right text-xs">{detail.customerEmail ?? detail.customerPhone ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">When</span><span>{detail.whenLocal}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[detail.status] ?? "bg-stone-100 text-stone-600"}`}>{detail.status.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between"><span className="text-stone-500">Price</span><span className="font-semibold">AED {(detail.priceFils / 100).toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Payment</span>
                <span>{(detail.paymentStatus ?? "unknown").replace(/_/g, " ")}</span>
              </div>
              {detail.customerNotes && (
                <div className="pt-1">
                  <p className="text-stone-500 text-xs mb-1">Customer notes</p>
                  <p className="text-xs bg-stone-50 border border-stone-200 rounded-lg p-2">{detail.customerNotes}</p>
                </div>
              )}
              {detail.cancellationReason && (
                <div className="pt-1">
                  <p className="text-red-500 text-xs mb-1">Cancellation reason</p>
                  <p className="text-xs bg-red-50 border border-red-200 rounded-lg p-2">{detail.cancellationReason}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-orange-500" /> Status timeline
              </p>
              <div className="space-y-0">
                {detail.history.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 ${i === detail.history.length - 1 ? "bg-orange-500" : "bg-stone-300"}`} />
                      {i < detail.history.length - 1 && <div className="w-px flex-1 bg-stone-200" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-medium text-stone-700">
                        {h.fromStatus ? `${h.fromStatus.replace(/_/g, " ")} → ` : ""}{h.toStatus.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {h.atLocal} · by {h.changedBy === "customer" ? "customer" : h.changedBy === "system" ? "system" : "staff"}
                        {h.reason ? ` · ${h.reason}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
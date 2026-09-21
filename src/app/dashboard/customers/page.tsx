// src/app/dashboard/customers/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  checked_in: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-stone-200 text-stone-700",
  cancelled: "bg-red-100 text-red-600",
  no_show: "bg-stone-200 text-stone-500",
};

export default function CustomersPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: customers, isLoading } = trpc.customers.listCustomers.useQuery(
    { organizationId: ws?.organization.id ?? "", search: search || undefined },
    { enabled: !!ws?.organization.id }
  );

  const { data: detail, isLoading: detailLoading } = trpc.customers.getCustomerDetail.useQuery(
    { organizationId: ws?.organization.id ?? "", customerId: selectedId ?? "" },
    { enabled: !!selectedId }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Customers</h1>
        <p className="text-sm text-stone-500">Your client base and their booking history</p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone..."
          className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-stone-500">Loading customers...</CardContent></Card>
          ) : (customers ?? []).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-stone-500">No customers found.</CardContent></Card>
          ) : (
            (customers ?? []).map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === c.id ? "border-orange-400 bg-orange-50" : "border-stone-200 bg-white hover:border-orange-300"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{c.name}</p>
                      <p className="text-xs text-stone-500">{c.email ?? c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-stone-700">AED {(c.totalSpentFils / 100).toLocaleString()}</p>
                    <p className="text-[10px] text-stone-400">{c.totalAppointments} bookings</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div>
          {!selectedId ? (
            <Card className="h-full"><CardContent className="p-8 text-center text-stone-400 text-sm">
              Select a customer to see their history
            </CardContent></Card>
          ) : detailLoading ? (
            <Card><CardContent className="p-8 text-center text-stone-500">Loading history...</CardContent></Card>
          ) : detail ? (
            <Card className="shadow-sm border-stone-200">
              <CardHeader>
                <CardTitle className="text-base">{detail.customer.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-stone-50 border border-stone-100">
                    <p className="text-lg font-bold text-stone-800">{detail.customer.totalAppointments}</p>
                    <p className="text-[10px] text-stone-500">Total</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <p className="text-lg font-bold text-emerald-700">{detail.customer.completedAppointments}</p>
                    <p className="text-[10px] text-emerald-600">Completed</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-lg font-bold text-red-600">{detail.customer.cancelledAppointments}</p>
                    <p className="text-[10px] text-red-500">Cancelled</p>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50 border border-stone-100">
                    <p className="text-lg font-bold text-stone-600">{detail.customer.noShowCount}</p>
                    <p className="text-[10px] text-stone-500">No-shows</p>
                  </div>
                </div>

                <div className="text-xs text-stone-500 space-y-1">
                  <p>Email: {detail.customer.email ?? "—"}</p>
                  <p>Phone: {detail.customer.phone ?? "—"}</p>
                  <p>Lifetime value: <span className="font-semibold">AED {(detail.customer.totalSpentFils / 100).toLocaleString()}</span></p>
                  <p>Consent: {detail.customer.consentGiven ? "✅ given" : "❌ not given"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">Booking history</p>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {detail.history.length === 0 && <p className="text-xs text-stone-400">No appointments yet.</p>}
                    {detail.history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-stone-100 bg-stone-50">
                        <div>
                          <p className="text-xs font-medium text-stone-700">{h.serviceName} · {h.staffName}</p>
                          <p className="text-[10px] text-stone-400">{h.whenLocal}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status] ?? "bg-stone-100 text-stone-600"}`}>
                          {h.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
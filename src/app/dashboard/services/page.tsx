// src/app/dashboard/services/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Archive, ArchiveRestore, Eye, EyeOff, Clock } from "lucide-react";

export default function ServicesPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();

  const { data: services, isLoading } = trpc.services.listAdminServices.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );
  const { data: staffOptions } = trpc.services.listStaffOptions.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [priceAed, setPriceAed] = useState("100");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [shortDesc, setShortDesc] = useState("");
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  const createService = trpc.services.createService.useMutation({
    onSuccess: () => {
      utils.services.listAdminServices.invalidate();
      setShowForm(false);
      setName(""); setDuration("60"); setPriceAed("100"); setBufferAfter("0"); setShortDesc(""); setStaffIds([]);
      setFormError("");
    },
    onError: (err) => setFormError(err.message),
  });

  const updateService = trpc.services.updateService.useMutation({
    onSuccess: () => utils.services.listAdminServices.invalidate(),
  });

  const toggleStaff = (id: string) =>
    setStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    createService.mutate({
      organizationId: ws?.organization.id ?? "",
      name,
      durationMinutes: Number(duration),
      priceFils: Math.round(Number(priceAed) * 100),
      bufferAfterMinutes: Number(bufferAfter),
      shortDescription: shortDesc || undefined,
      staffIds: staffIds.length ? staffIds : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Services</h1>
          <p className="text-sm text-stone-500">Create, price, and assign your service menu</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" /> New service
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-sm border-orange-200">
          <CardContent className="p-4">
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-stone-700">Service name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Duration (minutes) *</label>
                <input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} required
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Price (AED) *</label>
                <input type="number" min={0} step={5} value={priceAed} onChange={(e) => setPriceAed(e.target.value)} required
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Buffer after (minutes)</label>
                <input type="number" min={0} step={5} value={bufferAfter} onChange={(e) => setBufferAfter(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Short description</label>
                <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-stone-700">Eligible staff</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(staffOptions ?? []).map((s) => (
                    <button type="button" key={s.id} onClick={() => toggleStaff(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        staffIds.includes(s.id)
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-stone-600 border-stone-300 hover:border-orange-300"
                      }`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              {formError && (
                <div className="sm:col-span-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
              )}
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={createService.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white">
                  {createService.isPending ? "Saving..." : "Save service"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-stone-500">Loading services...</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(services ?? []).map((s) => (
            <Card key={s.id} className={`shadow-sm border-stone-200 ${s.isArchived ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-800">{s.name}</p>
                    {!s.isActive && !s.isArchived && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">hidden</span>
                    )}
                    {s.isArchived && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">archived</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.durationMinutes} min</span>
                    <span>AED {(s.priceFils / 100).toFixed(0)}</span>
                    {s.bufferAfterMinutes > 0 && <span>+{s.bufferAfterMinutes}m buffer</span>}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Staff: {s.staff.length ? s.staff.map((x) => x.name).join(", ") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={updateService.isPending}
                    onClick={() => updateService.mutate({ organizationId: ws!.organization.id, serviceId: s.id, isActive: !s.isActive })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 flex items-center gap-1 disabled:opacity-50">
                    {s.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {s.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    disabled={updateService.isPending}
                    onClick={() => updateService.mutate({ organizationId: ws!.organization.id, serviceId: s.id, isArchived: !s.isArchived })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 flex items-center gap-1 disabled:opacity-50">
                    {s.isArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                    {s.isArchived ? "Restore" : "Archive"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
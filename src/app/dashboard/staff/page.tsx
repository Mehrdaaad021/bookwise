// src/app/dashboard/staff/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck, UserX } from "lucide-react";

export default function StaffPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const utils = trpc.useUtils();

  const { data: staff, isLoading } = trpc.staff.listAdminStaff.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );
  const { data: serviceOptions } = trpc.staff.listServiceOptions.useQuery(
    { organizationId: ws?.organization.id ?? "" },
    { enabled: !!ws?.organization.id }
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  const createStaff = trpc.staff.createStaff.useMutation({
    onSuccess: () => {
      utils.staff.listAdminStaff.invalidate();
      setShowForm(false);
      setName(""); setRole(""); setBio(""); setServiceIds([]); setFormError("");
    },
    onError: (err) => setFormError(err.message),
  });

  const updateStaff = trpc.staff.updateStaff.useMutation({
    onSuccess: () => utils.staff.listAdminStaff.invalidate(),
  });

  const toggleService = (id: string) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    createStaff.mutate({
      organizationId: ws?.organization.id ?? "",
      name,
      role: role || undefined,
      bio: bio || undefined,
      serviceIds: serviceIds.length ? serviceIds : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Staff</h1>
          <p className="text-sm text-stone-500">Your team and the services they perform</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" /> New staff
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-sm border-orange-200">
          <CardContent className="p-4">
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-stone-700">Full name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Role / title</label>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Therapist"
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-stone-700">Bio</label>
                <input value={bio} onChange={(e) => setBio(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-stone-700">Performs these services</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(serviceOptions ?? []).map((s) => (
                    <button type="button" key={s.id} onClick={() => toggleService(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        serviceIds.includes(s.id)
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
                <Button type="submit" disabled={createStaff.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white">
                  {createStaff.isPending ? "Saving..." : "Save staff"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-stone-500">Loading staff...</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(staff ?? []).map((s) => (
            <Card key={s.id} className={`shadow-sm border-stone-200 ${!s.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{s.name}</p>
                      <p className="text-xs text-stone-500">{s.role ?? "—"}</p>
                    </div>
                  </div>
                  <button
                    disabled={updateStaff.isPending}
                    onClick={() => updateStaff.mutate({ organizationId: ws!.organization.id, staffId: s.id, isActive: !s.isActive })}
                    className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1 disabled:opacity-50 ${
                      s.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                    }`}>
                    {s.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    {s.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
                {s.bio && <p className="text-xs text-stone-500 mt-2">{s.bio}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.services.length === 0 && <span className="text-[10px] text-stone-400">No services assigned</span>}
                  {s.services.map((sv) => (
                    <span key={sv.id} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      {sv.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
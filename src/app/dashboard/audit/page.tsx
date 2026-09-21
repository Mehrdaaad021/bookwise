// src/app/dashboard/audit/page.tsx
"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

function toneFor(action: string): string {
  if (action.startsWith("appointment")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (action.startsWith("settings")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (action.startsWith("service")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (action.startsWith("staff")) return "bg-purple-50 text-purple-700 border-purple-200";
  if (action.startsWith("availability")) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-stone-50 text-stone-600 border-stone-200";
}

export default function AuditPage() {
  const { data: ws } = trpc.workspace.getMyWorkspace.useQuery();
  const { data: rows, isLoading, error } = trpc.audit.listAuditLogs.useQuery(
    { organizationId: ws?.organization.id ?? "", limit: 100 },
    { enabled: !!ws?.organization.id }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-orange-500" /> Audit Log
        </h1>
        <p className="text-sm text-stone-500">
          Forensic trail of sensitive changes — visible to owners only
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-stone-500">Loading audit trail...</CardContent></Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-red-600">
            {error.message}
          </CardContent>
        </Card>
      ) : !rows || rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-stone-500">No audit entries yet.</CardContent></Card>
      ) : (
        <Card className="shadow-sm border-stone-200">
          <CardContent className="p-0 divide-y divide-stone-100">
            {rows.map((r) => (
              <div key={r.id} className="p-3 flex flex-wrap items-center gap-3">
                <span className={`text-[11px] px-2 py-1 rounded-full border font-medium ${toneFor(r.action)}`}>
                  {r.action}
                </span>
                <span className="text-xs text-stone-500">
                  {r.entityType}
                  {r.entityId && <span className="font-mono text-[10px] text-stone-400 ml-1">#{r.entityId.slice(0, 8)}</span>}
                </span>
                <span className="text-xs text-stone-600 ml-auto">by <span className="font-medium">{r.actorName}</span></span>
                <span className="text-[11px] text-stone-400">{r.atLocal}</span>
                {r.meta && Object.keys(r.meta as object).length > 0 && (
                  <span className="w-full text-[10px] text-stone-400 font-mono bg-stone-50 border border-stone-100 rounded px-2 py-1 truncate">
                    {JSON.stringify(r.meta)}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
// src/app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <header className="max-w-5xl mx-auto w-full px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <span className="font-bold text-stone-800">Bookwise</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-800">
          Owner sign in
        </Link>
      </header>

      <section className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto w-full px-4 py-16 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-6">
            Portfolio demo — multi-tenant booking SaaS
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-800 leading-tight">
            Booking infrastructure for
            <span className="text-orange-600"> UAE service businesses</span>
          </h1>
          <p className="mt-4 text-stone-500 max-w-2xl mx-auto">
            Timezone-safe scheduling, policy-aware cancellations, and a full business
            workspace — built with Next.js, tRPC, Drizzle and Neon.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/book/demo-salon"
              className="px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm"
            >
              Try the live demo booking
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg border border-stone-300 bg-white text-stone-700 font-semibold hover:bg-stone-100"
            >
              Open the workspace
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              {
                icon: Clock,
                title: "Timezone-safe engine",
                text: "UTC storage with IANA business-timezone logic — DST-safe by construction.",
              },
              {
                icon: CalendarCheck,
                title: "No double bookings",
                text: "Transactional slot validation re-checks overlaps right before insert.",
              },
              {
                icon: ShieldCheck,
                title: "Audited & policy-aware",
                text: "Role guards, cancellation windows and an owner-only audit trail.",
              },
            ].map((f) => (
              <div key={f.title} className="p-5 rounded-xl bg-white border border-stone-200 shadow-sm">
                <f.icon className="w-5 h-5 text-orange-500 mb-3" />
                <h3 className="font-semibold text-stone-800">{f.title}</h3>
                <p className="mt-1 text-sm text-stone-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto w-full px-4 py-6 text-center text-xs text-stone-400">
        Bookwise v1.0.0 — demo data only. No real payments or emails.
      </footer>
    </main>
  );
}
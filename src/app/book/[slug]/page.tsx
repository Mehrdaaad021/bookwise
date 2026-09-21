// src/app/book/[slug]/page.tsx
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { BookingFlow } from "./booking-flow";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await db.query.organizations.findFirst({
    where: and(eq(organizations.slug, slug), eq(organizations.isActive, true)),
  });
  if (!org) return { title: "Business not found — Bookwise" };
  return {
    title: `Book ${org.name} — Online Appointments | Bookwise`,
    description: org.description ?? `Book your appointment at ${org.name} online in minutes.`,
  };
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const org = await db.query.organizations.findFirst({
    where: and(eq(organizations.slug, slug), eq(organizations.isActive, true)),
  });
  if (!org) notFound();

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <BookingFlow
        organization={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logoUrl: org.logoUrl,
          timezone: org.timezone,
          currency: org.currency,
          phone: org.phone,
          address: org.address,
          city: org.city,
          isDemo: org.isDemo,
        }}
      />
    </div>
  );
}
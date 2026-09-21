// src/app/book/[slug]/manage/page.tsx
import { ManageBooking } from "./manage-booking";

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  return <ManageBooking slug={slug} token={token ?? ""} />;
}
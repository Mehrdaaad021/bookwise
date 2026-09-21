// src/app/book/[slug]/manage/manage-booking.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarX, CalendarClock } from "lucide-react";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SlotInfo = { startISO: string; displayStart: string } & Record<string, unknown>;

export function ManageBooking({ slug, token }: { slug: string; token: string }) {
  const utils = trpc.useUtils();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [pendingSlot, setPendingSlot] = useState<SlotInfo | null>(null);
  const [notice, setNotice] = useState("");

  const { data, isLoading, error } = trpc.manage.getBookingForManage.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: availability, isLoading: availabilityLoading } = trpc.public.getAvailability.useQuery(
    {
      organizationId: data?.organizationId ?? "",
      serviceId: data?.serviceId ?? "",
      staffId: data?.staffId ?? undefined,
      date: reschedDate,
    },
    { enabled: reschedOpen && !!data && !!reschedDate }
  );

  const cancel = trpc.public.cancelBookingByToken.useMutation({
    onSuccess: () => {
      utils.manage.getBookingForManage.invalidate({ token });
      setConfirmCancel(false);
      setNotice("✅ Your booking was cancelled.");
    },
    onError: (err) => setNotice(`❌ ${err.message}`),
  });

  const reschedule = trpc.manage.requestRescheduleByToken.useMutation({
    onSuccess: () => {
      utils.manage.getBookingForManage.invalidate({ token });
      utils.public.getAvailability.invalidate();
      setReschedOpen(false);
      setPendingSlot(null);
      setNotice("✅ Your booking was rescheduled successfully.");
    },
    onError: (err) => setNotice(`❌ ${err.message}`),
  });

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-stone-500">
        Missing manage token. Please use the link from your booking confirmation.
      </div>
    );
  }
  if (isLoading) return <div className="max-w-md mx-auto py-16 text-center text-stone-500">Loading booking...</div>;
  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-stone-500">
        Booking not found. Please check that your link is complete.
      </div>
    );
  }

  const cancelled = data.status === "cancelled";
  const when = new Date(data.startsAtISO).toLocaleString("en-GB", {
    timeZone: data.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <Link href={`/book/${slug}`}
        className="text-sm text-stone-500 hover:text-stone-700 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Book another appointment
      </Link>

      {notice && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${
          notice.startsWith("❌") ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {notice}
        </div>
      )}

      <Card className="shadow-sm border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">Manage your booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">Reference</span><span className="font-mono">{data.reference}</span></div>
          <div className="flex justify-between">
            <span className="text-stone-500">Status</span>
            <span className={`capitalize font-medium ${cancelled ? "text-red-600" : "text-emerald-600"}`}>
              {data.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex justify-between"><span className="text-stone-500">Business</span><span>{data.businessName}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Service</span><span>{data.serviceName}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Professional</span><span>{data.staffName}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">When</span><span className="text-right">{when}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Timezone</span><span>{data.timezone}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Total</span><span className="font-semibold">AED {(data.priceFils / 100).toFixed(0)}</span></div>

          <div className="pt-4 space-y-2">
            {cancelled ? (
              <p className="text-center text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-lg p-3">
                This booking has been cancelled. You can book a new appointment anytime.
              </p>
            ) : (
              <>
                {data.canReschedule && (
                  reschedOpen ? (
                    <div className="space-y-3 border border-stone-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-stone-700 flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-orange-500" /> Pick a new time
                      </p>
                      <div className="flex gap-1.5 overflow-x-auto pb-2">
                        {dates.map((date) => {
                          const d = new Date(date);
                          const isSelected = reschedDate === date;
                          return (
                            <button key={date}
                              onClick={() => { setReschedDate(date); setPendingSlot(null); }}
                              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-center transition-all ${
                                isSelected ? "bg-orange-500 text-white" : "bg-white border border-stone-200 hover:border-orange-300"
                              }`}>
                              <div className="text-[10px] font-medium">{DAY_SHORT[d.getDay()]}</div>
                              <div className="text-sm font-bold">{d.getDate()}</div>
                            </button>
                          );
                        })}
                      </div>

                      {reschedDate && (
                        availabilityLoading ? (
                          <p className="text-xs text-stone-400 text-center py-2">Checking availability...</p>
                        ) : availability?.slots?.length ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {availability.slots.map((slot, idx) => (
                              <button key={idx}
                                onClick={() => setPendingSlot(slot)}
                                className={`py-1.5 px-1 rounded-lg border text-xs font-medium transition-all ${
                                  pendingSlot?.startISO === slot.startISO
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "border-stone-200 hover:border-orange-400 hover:bg-orange-50"
                                }`}>
                                {slot.displayStart}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 text-center py-2">
                            {availability?.noAvailabilityReason || "No available times on this date"}
                          </p>
                        )
                      )}

                      {pendingSlot && (
                        <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-lg p-2">
                          <span className="text-xs text-stone-600">
                            New time: <span className="font-medium">{reschedDate} at {pendingSlot.displayStart}</span>
                          </span>
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                            disabled={reschedule.isPending}
                            onClick={() => reschedule.mutate({ token, newStartsAt: pendingSlot.startISO })}>
                            {reschedule.isPending ? "Saving..." : "Confirm"}
                          </Button>
                        </div>
                      )}

                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setReschedOpen(false); setPendingSlot(null); }}>
                        Close
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full text-stone-700 border-stone-300 hover:bg-stone-50"
                      onClick={() => { setReschedOpen(true); setNotice(""); }}>
                      <CalendarClock className="w-4 h-4 mr-2" /> Reschedule booking
                    </Button>
                  )
                )}

                {confirmCancel ? (
                  <div className="space-y-2">
                    <p className="text-sm text-stone-600">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setConfirmCancel(false)}>Keep booking</Button>
                      <Button variant="destructive" className="flex-1" disabled={cancel.isPending}
                        onClick={() => cancel.mutate({ token })}>
                        {cancel.isPending ? "Cancelling..." : "Yes, cancel"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setConfirmCancel(true); setNotice(""); }}>
                    <CalendarX className="w-4 h-4 mr-2" /> Cancel booking
                  </Button>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-stone-400 pt-2">
            Free cancellation and reschedule up to {data.cancellationWindowHours} hours before the appointment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
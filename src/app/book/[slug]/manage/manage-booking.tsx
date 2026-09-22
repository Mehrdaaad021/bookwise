// src/app/book/[slug]/manage/manage-booking.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { ArrowLeft, CalendarX, CalendarClock, Check, Shield, AlertCircle } from "lucide-react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.mg { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f7f6f3; color: #171512; -webkit-font-smoothing: antialiased; min-height: 100vh; padding: 32px 20px 60px; }
.mg * { box-sizing: border-box; }
.mg a { text-decoration: none; }
.mg-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #78716c; margin-bottom: 20px; }
.mg-back:hover { color: #171512; }
.mg-wrap { max-width: 500px; margin: 0 auto; }
.mg-head { text-align: center; margin-bottom: 20px; }
.mg-head h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.mg-head p { font-size: 13px; color: #78716c; margin-top: 3px; }
.mg-notice { padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 14px; display: flex; gap: 8px; align-items: center; }
.mg-notice.ok { background: #dcfce7; border: 1px solid #bbf7d0; color: #166534; }
.mg-notice.err { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.mg-card { background: #fff; border: 1px solid #e8e5df; border-radius: 16px; overflow: hidden; }
.mg-card-head { padding: 16px 20px; border-bottom: 1px solid #f0eee9; }
.mg-card-head h2 { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.mg-card-body { padding: 4px 0; }
.mg-row { display: flex; justify-content: space-between; gap: 12px; padding: 11px 20px; border-bottom: 1px solid #f5f4f0; font-size: 13px; }
.mg-row:last-child { border-bottom: none; }
.mg-row span:first-child { color: #78716c; flex-shrink: 0; }
.mg-row span:last-child { font-weight: 600; text-align: right; }
.mg-status { display: inline-flex; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.mg-status.active { background: #dcfce7; color: #166534; }
.mg-status.cancelled { background: #fee2e2; color: #991b1b; }
.mg-status.pending { background: #fef3c7; color: #92400e; }
.mg-actions { padding: 16px 20px; border-top: 1px solid #f0eee9; display: flex; flex-direction: column; gap: 8px; }
.mg-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all .12s; border: 1px solid transparent; }
.mg-btn-outline { background: #fff; border-color: #e0ddd6; color: #44403c; }
.mg-btn-outline:hover { border-color: #c9c5bc; }
.mg-btn-danger { background: #fff; border-color: #fecaca; color: #b91c1c; }
.mg-btn-danger:hover { background: #fef2f2; }
.mg-btn-primary { background: #171512; color: #fff; }
.mg-btn-primary:hover { background: #292524; }
.mg-btn:disabled { opacity: .5; cursor: not-allowed; }
.mg-policy { padding: 12px 20px; background: #faf9f6; border-top: 1px solid #f0eee9; font-size: 11.5px; color: #78716c; display: flex; gap: 6px; align-items: flex-start; }
.mg-empty { padding: 60px 20px; text-align: center; color: #a8a29e; font-size: 14px; }

.mg-resch { padding: 16px 20px; border-top: 1px solid #f0eee9; }
.mg-resch h3 { font-size: 13px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.mg-dates { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 10px; }
.mg-date { flex-shrink: 0; min-width: 58px; padding: 8px 4px; border-radius: 9px; border: 1px solid #e8e5df; background: #fff; cursor: pointer; text-align: center; font-family: inherit; font-size: 11px; }
.mg-date.on { background: #171512; color: #fff; border-color: #171512; }
.mg-date .dow { font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #a8a29e; font-size: 9.5px; }
.mg-date.on .dow { color: #d6d3d1; }
.mg-date .day { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; margin: 2px 0; }
.mg-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 10px; }
.mg-slot { padding: 8px 4px; border-radius: 7px; border: 1px solid #e8e5df; background: #fff; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 600; }
.mg-slot.on { background: #171512; color: #fff; border-color: #171512; }
.mg-confirm { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 9px; background: #faf9f6; border: 1px solid #e8e5df; font-size: 12px; }
.mg-confirm span { color: #57534e; }
.mg-confirm b { color: #171512; }
`;

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SlotInfo = { startISO: string; displayStart: string } & Record<string, unknown>;

export function ManageBooking({ slug, token }: { slug: string; token: string }) {
  const utils = trpc.useUtils();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [pendingSlot, setPendingSlot] = useState<SlotInfo | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const { data, isLoading, error } = trpc.manage.getBookingForManage.useQuery(
    { token }, { enabled: !!token }
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
      setNotice({ kind: "ok", text: "Your booking was cancelled." });
    },
    onError: (err) => setNotice({ kind: "err", text: err.message }),
  });

  const reschedule = trpc.manage.requestRescheduleByToken.useMutation({
    onSuccess: () => {
      utils.manage.getBookingForManage.invalidate({ token });
      utils.public.getAvailability.invalidate();
      setReschedOpen(false);
      setPendingSlot(null);
      setNotice({ kind: "ok", text: "Your booking was rescheduled successfully." });
    },
    onError: (err) => setNotice({ kind: "err", text: err.message }),
  });

  if (!token) return <div className="mg-empty">Missing manage token.</div>;
  if (isLoading) return <div className="mg-empty">Loading booking...</div>;
  if (error || !data) return <div className="mg-empty">Booking not found. Please check your link.</div>;

  const cancelled = data.status === "cancelled";
  const when = new Date(data.startsAtISO).toLocaleString("en-GB", {
    timeZone: data.timezone, dateStyle: "full", timeStyle: "short",
  });

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      d,
    };
  });

  const statusClass = cancelled ? "cancelled" : data.status === "pending" ? "pending" : "active";

  return (
    <div className="mg">
      <style>{css}</style>
      <div className="mg-wrap">
        <Link href={`/book/${slug}`} className="mg-back">
          <ArrowLeft size={14} /> Book another appointment
        </Link>

        <div className="mg-head">
          <h1>Manage your booking</h1>
          <p>{data.businessName}</p>
        </div>

        {notice && (
          <div className={`mg-notice ${notice.kind}`}>
            {notice.kind === "ok" ? <Check size={15} /> : <AlertCircle size={15} />}
            {notice.text}
          </div>
        )}

        <div className="mg-card">
          <div className="mg-card-head"><h2>Booking details</h2></div>
          <div className="mg-card-body">
            <div className="mg-row"><span>Reference</span><span style={{ fontFamily: "ui-monospace" }}>{data.reference}</span></div>
            <div className="mg-row">
              <span>Status</span>
              <span className={`mg-status ${statusClass}`}>{data.status.replace(/_/g, " ")}</span>
            </div>
            <div className="mg-row"><span>Service</span><span>{data.serviceName}</span></div>
            <div className="mg-row"><span>Professional</span><span>{data.staffName}</span></div>
            <div className="mg-row"><span>When</span><span style={{ fontSize: 12, maxWidth: 220 }}>{when}</span></div>
            <div className="mg-row"><span>Timezone</span><span>{data.timezone}</span></div>
            <div className="mg-row"><span>Total</span><span>AED {(data.priceFils / 100).toFixed(0)}</span></div>
          </div>

          {!cancelled && data.canReschedule && (
            <>
              <div className="mg-actions">
                {reschedOpen ? (
                  <button className="mg-btn mg-btn-outline" onClick={() => { setReschedOpen(false); setPendingSlot(null); }}>
                    Cancel reschedule
                  </button>
                ) : (
                  <button className="mg-btn mg-btn-primary" onClick={() => { setReschedOpen(true); setNotice(null); }}>
                    <CalendarClock size={15} /> Reschedule booking
                  </button>
                )}

                {confirmCancel ? (
                  <>
                    <div style={{ padding: 10, borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#991b1b", textAlign: "center" }}>
                      Are you sure? This cannot be undone.
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="mg-btn mg-btn-outline" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>Keep</button>
                      <button className="mg-btn mg-btn-danger" style={{ flex: 1 }} disabled={cancel.isPending} onClick={() => cancel.mutate({ token })}>
                        {cancel.isPending ? "Cancelling..." : "Yes, cancel"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button className="mg-btn mg-btn-danger" onClick={() => { setConfirmCancel(true); setNotice(null); }}>
                    <CalendarX size={15} /> Cancel booking
                  </button>
                )}
              </div>

              {reschedOpen && (
                <div className="mg-resch">
                  <h3><CalendarClock size={14} /> Pick a new time</h3>
                  <div className="mg-dates">
                    {dates.map(({ key, d }) => (
                      <button key={key} className={`mg-date ${reschedDate === key ? "on" : ""}`}
                        onClick={() => { setReschedDate(key); setPendingSlot(null); }}>
                        <div className="dow">{DAY_SHORT[d.getDay()]}</div>
                        <div className="day">{d.getDate()}</div>
                      </button>
                    ))}
                  </div>

                  {reschedDate && (
                    <>
                      {availabilityLoading ? (
                        <div style={{ padding: 14, textAlign: "center", color: "#a8a29e", fontSize: 12 }}>Checking availability...</div>
                      ) : availability?.slots?.length ? (
                        <div className="mg-slots">
                          {availability.slots.map((slot, idx) => (
                            <button key={idx} className={`mg-slot ${pendingSlot?.startISO === slot.startISO ? "on" : ""}`}
                              onClick={() => setPendingSlot(slot)}>
                              {slot.displayStart}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 14, textAlign: "center", color: "#a8a29e", fontSize: 12 }}>
                          {availability?.noAvailabilityReason || "No times available on this day"}
                        </div>
                      )}

                      {pendingSlot && (
                        <div className="mg-confirm">
                          <span>New: <b>{reschedDate}</b> at <b>{pendingSlot.displayStart}</b></span>
                          <button className="mg-btn mg-btn-primary" style={{ width: "auto", padding: "8px 14px", fontSize: 12 }}
                            disabled={reschedule.isPending}
                            onClick={() => reschedule.mutate({ token, newStartsAt: pendingSlot.startISO })}>
                            {reschedule.isPending ? "Saving..." : "Confirm"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {cancelled && (
            <div className="mg-policy">
              <Shield size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>This booking has been cancelled. You can book a new appointment anytime.</span>
            </div>
          )}

          {!cancelled && (
            <div className="mg-policy">
              <Shield size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Free cancellation and reschedule up to {data.cancellationWindowHours} hours before the appointment.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
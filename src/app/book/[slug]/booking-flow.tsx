// src/app/book/[slug]/booking-flow.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import {
  Check, Clock, MapPin, Phone, Sparkles, ArrowLeft, Info,
  User, CalendarDays, Scissors,
} from "lucide-react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.bk { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f7f6f3; color: #171512; -webkit-font-smoothing: antialiased; min-height: 100vh; padding: 32px 20px 60px; }
.bk * { box-sizing: border-box; }
.bk a { text-decoration: none; color: inherit; }
.bk-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #78716c; margin-bottom: 20px; cursor: pointer; background: none; border: none; padding: 0; }
.bk-back:hover { color: #171512; }
.bk-head { max-width: 560px; margin: 0 auto 28px; text-align: center; }
.bk-logo { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; color: #fff; margin: 0 auto 14px; }
.bk-head h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.025em; }
.bk-head p { font-size: 14px; color: #78716c; margin-top: 4px; }
.bk-meta { display: flex; gap: 14px; justify-content: center; margin-top: 10px; font-size: 12px; color: #a8a29e; flex-wrap: wrap; }
.bk-meta span { display: inline-flex; align-items: center; gap: 4px; }
.bk-badge { display: inline-block; margin-top: 12px; padding: 4px 11px; border-radius: 999px; background: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 11px; font-weight: 700; }
.bk-info { max-width: 560px; margin: 0 auto 16px; padding: 10px 14px; border-radius: 10px; background: #fff; border: 1px solid #e8e5df; font-size: 12px; color: #57534e; display: flex; align-items: center; gap: 8px; }
.bk-info svg { color: #ea580c; flex-shrink: 0; }

.bk-steps { max-width: 560px; margin: 0 auto 22px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.bk-step { display: flex; align-items: center; gap: 6px; }
.bk-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; transition: all .15s; }
.bk-dot.done { background: #22c55e; color: #fff; }
.bk-dot.cur { background: #171512; color: #fff; }
.bk-dot.todo { background: #eeece7; color: #a8a29e; }
.bk-line { width: 20px; height: 2px; background: #eeece7; }
.bk-line.done { background: #22c55e; }

.bk-card { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #e8e5df; border-radius: 16px; overflow: hidden; }
.bk-card-head { padding: 18px 22px; border-bottom: 1px solid #f0eee9; }
.bk-card-head h2 { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; }
.bk-card-head p { font-size: 12.5px; color: #78716c; margin-top: 2px; }
.bk-card-body { padding: 18px 22px; }

.bk-opt { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #e8e5df; border-radius: 12px; background: #fff; width: 100%; text-align: left; cursor: pointer; transition: all .12s; margin-bottom: 10px; font-family: inherit; }
.bk-opt:hover { border-color: #ea580c; background: #fef9f4; transform: translateY(-1px); }
.bk-opt .ico { width: 38px; height: 38px; border-radius: 10px; background: #f5f4f0; display: flex; align-items: center; justify-content: center; color: #57534e; flex-shrink: 0; font-weight: 700; font-size: 15px; }
.bk-opt .ico.hot { background: #fef3e7; color: #ea580c; }
.bk-opt .body { flex: 1; min-width: 0; }
.bk-opt .body b { display: block; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.bk-opt .body span { font-size: 12px; color: #78716c; display: block; margin-top: 2px; }
.bk-opt .rhs { text-align: right; font-size: 13px; font-weight: 700; color: #171512; }
.bk-opt .rhs span { display: block; font-size: 11px; color: #a8a29e; font-weight: 500; margin-top: 2px; }

.bk-dates { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 14px; }
.bk-date { flex-shrink: 0; min-width: 66px; padding: 10px 6px; border-radius: 10px; border: 1px solid #e8e5df; background: #fff; cursor: pointer; text-align: center; font-family: inherit; transition: all .12s; }
.bk-date:hover { border-color: #ea580c; }
.bk-date.on { background: #171512; color: #fff; border-color: #171512; }
.bk-date .dow { font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #a8a29e; }
.bk-date.on .dow { color: #d6d3d1; }
.bk-date .day { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 2px 0; }
.bk-date .mon { font-size: 11px; color: #a8a29e; }
.bk-date.on .day, .bk-date.on .mon { color: #fff; }

.bk-slots-head { font-size: 12px; font-weight: 700; color: #78716c; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 8px; }
.bk-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
@media (max-width: 500px) { .bk-slots { grid-template-columns: repeat(3, 1fr); } }
.bk-slot { padding: 9px 6px; border-radius: 8px; border: 1px solid #e8e5df; background: #fff; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 600; color: #171512; transition: all .12s; }
.bk-slot:hover { border-color: #ea580c; background: #fef9f4; }
.bk-empty { padding: 24px; text-align: center; color: #a8a29e; font-size: 13px; grid-column: 1 / -1; }

.bk-summary { padding: 14px; border-radius: 12px; background: #faf9f6; border: 1px solid #e8e5df; margin-bottom: 18px; font-size: 13px; }
.bk-summary b { display: block; font-size: 14px; font-weight: 700; }
.bk-summary span { display: block; font-size: 12px; color: #78716c; margin-top: 3px; }
.bk-summary .pr { font-size: 15px; font-weight: 800; color: #171512; margin-top: 6px; }

.bk-form .f { margin-bottom: 14px; }
.bk-form label { display: block; font-size: 12px; font-weight: 600; color: #57534e; margin-bottom: 5px; }
.bk-form .input { width: 100%; padding: 10px 12px; border: 1px solid #e0ddd6; border-radius: 9px; font-size: 13px; font-family: inherit; outline: none; }
.bk-form .input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, .12); }
.bk-form textarea.input { resize: vertical; min-height: 70px; }
.bk-policies { padding: 10px 12px; border-radius: 10px; background: #faf9f6; border: 1px solid #e8e5df; font-size: 11px; line-height: 1.55; color: #78716c; margin-bottom: 14px; max-height: 120px; overflow-y: auto; }
.bk-consent { display: flex; gap: 8px; font-size: 12.5px; color: #44403c; margin-bottom: 14px; line-height: 1.5; }
.bk-consent span { font-size: 11px; color: #a8a29e; display: block; margin-top: 2px; }
.bk-submit { width: 100%; padding: 13px; border: none; border-radius: 10px; background: #171512; color: #fff; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all .15s; }
.bk-submit:hover { background: #292524; transform: translateY(-1px); }
.bk-submit:disabled { background: #a8a29e; cursor: not-allowed; transform: none; }

.bk-err { padding: 11px 14px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; margin-bottom: 12px; }

.bk-confirm { max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #fff; border: 1px solid #e8e5df; border-radius: 16px; text-align: center; }
.bk-confirm .ic { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.bk-confirm h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.bk-confirm p { color: #78716c; font-size: 14px; margin-top: 4px; }
.bk-confirm .sum { max-width: 360px; margin: 22px auto 0; background: #faf9f6; border: 1px solid #e8e5df; border-radius: 12px; padding: 14px; text-align: left; font-size: 13px; }
.bk-confirm .sum .row { display: flex; justify-content: space-between; padding: 4px 0; }
.bk-confirm .sum .row span:first-child { color: #78716c; }
.bk-confirm .sum .row span:last-child { font-weight: 600; text-align: right; max-width: 60%; }
.bk-manage { margin-top: 18px; padding: 12px; background: #fef3e7; border: 1px solid #fed7aa; border-radius: 10px; font-size: 12px; color: #9a3412; }
.bk-manage a { display: inline-block; margin-top: 6px; padding: 8px 16px; background: #fff; border: 1px solid #ea580c; color: #ea580c; border-radius: 8px; font-weight: 700; font-size: 12px; }
.bk-manage a:hover { background: #ea580c; color: #fff; }
`;

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isDemo?: boolean;
}

type ServiceInfo = { id: string; name: string; shortDescription: string | null; durationMinutes: number; priceFils: number };
type StaffInfo = { id: string | null; name: string; role?: string | null };
type SlotInfo = { startISO: string; displayStart: string } & Record<string, unknown>;
type AvailabilityInfo = { timezone: string; slots: SlotInfo[]; noAvailabilityReason: string | null };
type PoliciesInfo = {
  cancellationWindowHours: number;
  privacyNotice: string | null;
  bookingTerms: string | null;
  allowStaffSelection: boolean;
  businessHours: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[];
};
type BookingResult = {
  reference: string;
  manageToken: string;
  status: string;
  service: { name: string; priceFils: number };
  staffName: string;
  timezone: string;
};

type Step = "service" | "staff" | "datetime" | "details" | "confirmation";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function tomorrowKey(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingFlow({ organization }: { organization: Organization }) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const { data: policies } = trpc.public.getPublicPolicies.useQuery({ organizationId: organization.id });
  const allowStaff = policies?.allowStaffSelection ?? true;

  const { data: services, isLoading: servicesLoading, error: servicesError } =
    trpc.public.listActiveServices.useQuery({ organizationId: organization.id });

  const { data: staff, isLoading: staffLoading } = trpc.public.listEligibleStaff.useQuery(
    { organizationId: organization.id, serviceId: selectedService?.id ?? "" },
    { enabled: !!selectedService?.id && allowStaff }
  );

  const availabilityReady = !!selectedDate && !!selectedService?.id;
  const { data: availability, isLoading: availabilityLoading, error: availabilityError } =
    trpc.public.getAvailability.useQuery(
      {
        organizationId: organization.id,
        serviceId: selectedService?.id ?? "",
        staffId: selectedStaff?.id ?? undefined,
        date: selectedDate,
      },
      { enabled: availabilityReady }
    );

  const allSteps: { key: Step; label: string }[] = [
    { key: "service", label: "Service" },
    { key: "staff", label: "Professional" },
    { key: "datetime", label: "Date & Time" },
    { key: "details", label: "Your Details" },
  ];
  const steps = allowStaff ? allSteps : allSteps.filter((s) => s.key !== "staff");
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const todayHours = policies?.businessHours.find((h) => h.dayOfWeek === new Date().getDay());

  const enterDateTime = () => {
    if (!selectedDate) setSelectedDate(tomorrowKey());
    setStep("datetime");
  };

  const handleServiceSelect = (s: ServiceInfo) => {
    setSelectedService(s);
    if (allowStaff) setStep("staff");
    else {
      setSelectedStaff({ id: null, name: "Any Available Professional" });
      enterDateTime();
    }
  };

  return (
    <div className="bk">
      <style>{css}</style>

      <button className="bk-back" onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bk-head">
        <div className="bk-logo"><Sparkles size={28} /></div>
        <h1>{organization.name}</h1>
        {organization.description && <p>{organization.description}</p>}
        <div className="bk-meta">
          {organization.address && <span><MapPin size={12} />{organization.address}, {organization.city}</span>}
          {organization.phone && <span><Phone size={12} />{organization.phone}</span>}
        </div>
        {organization.isDemo && <span className="bk-badge">Demo workspace</span>}
      </div>

      {policies && (
        <div className="bk-info">
          <Info size={14} />
          <span>
            {todayHours?.isOpen ? `Open today ${todayHours.openTime}–${todayHours.closeTime}` : "Closed today"}
            {" · "}Free cancellation up to {policies.cancellationWindowHours}h before
          </span>
        </div>
      )}

      {step !== "confirmation" && (
        <div className="bk-steps">
          {steps.map((s, i) => (
            <div key={s.key} className="bk-step">
              <div className={`bk-dot ${i < currentStepIndex ? "done" : i === currentStepIndex ? "cur" : "todo"}`}>
                {i < currentStepIndex ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`bk-line ${i < currentStepIndex ? "done" : ""}`} />}
            </div>
          ))}
        </div>
      )}

      {step === "confirmation" ? (
        <Confirmation organization={organization} booking={bookingResult} slot={selectedSlot} date={selectedDate} />
      ) : (
        <div className="bk-card">
          <div className="bk-card-head">
            <h2>{steps[currentStepIndex]?.label}</h2>
            <p>{stepDescription(step)}</p>
          </div>
          <div className="bk-card-body">
            {step === "service" && (
              <ServiceStep services={services ?? []} loading={servicesLoading} error={servicesError} onSelect={handleServiceSelect} />
            )}
            {step === "staff" && allowStaff && (
              <StaffStep
                staff={staff ?? []}
                loading={staffLoading}
                onSelect={(s) => { setSelectedStaff(s); enterDateTime(); }}
                onBack={() => setStep("service")}
              />
            )}
            {step === "datetime" && (
              <DateTimeStep
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                availability={availability}
                loading={availabilityLoading}
                error={availabilityError}
                onSelectSlot={(slot) => { setSelectedSlot(slot); setStep("details"); }}
                onBack={() => setStep(allowStaff ? "staff" : "service")}
              />
            )}
            {step === "details" && (
              <DetailsStep
                organizationSlug={organization.slug}
                service={selectedService}
                staff={selectedStaff}
                slot={selectedSlot}
                date={selectedDate}
                policies={policies}
                onConfirm={(result) => { setBookingResult(result); setStep("confirmation"); }}
                onBack={() => setStep("datetime")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function stepDescription(step: Step): string {
  switch (step) {
    case "service": return "Choose the treatment you would like to book";
    case "staff": return "Pick your professional, or let us assign the best available";
    case "datetime": return "Select a day, then a time that works for you";
    case "details": return "Just a few details so we can confirm your booking";
    default: return "";
  }
}

function ServiceStep({ services, loading, error, onSelect }: {
  services: ServiceInfo[];
  loading: boolean;
  error: unknown;
  onSelect: (s: ServiceInfo) => void;
}) {
  if (loading) return <div className="bk-empty">Loading services...</div>;
  if (error) return <div className="bk-err">Failed to load services. Please refresh.</div>;
  if (!services.length) return <div className="bk-empty">No services available right now.</div>;

  return (
    <>
      {services.map((service) => (
        <button key={service.id} className="bk-opt" onClick={() => onSelect(service)}>
          <div className="ico hot"><Scissors size={18} /></div>
          <div className="body">
            <b>{service.name}</b>
            <span>{service.shortDescription || "—"}</span>
          </div>
          <div className="rhs">
            AED {(service.priceFils / 100).toFixed(0)}
            <span><Clock size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {service.durationMinutes} min</span>
          </div>
        </button>
      ))}
    </>
  );
}

function StaffStep({ staff, loading, onSelect, onBack }: {
  staff: { id: string; name: string; role: string | null }[];
  loading: boolean;
  onSelect: (s: StaffInfo) => void;
  onBack: () => void;
}) {
  if (loading) return <div className="bk-empty">Loading professionals...</div>;

  return (
    <>
      <button className="bk-back" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back to services
      </button>

      <button className="bk-opt" onClick={() => onSelect({ id: null, name: "Any Available Professional" })}>
        <div className="ico">?</div>
        <div className="body">
          <b>Any Available Professional</b>
          <span>We will assign the best available for your slot</span>
        </div>
      </button>

      {staff.map((s) => (
        <button key={s.id} className="bk-opt" onClick={() => onSelect({ id: s.id, name: s.name, role: s.role })}>
          <div className="ico">{s.name.charAt(0)}</div>
          <div className="body">
            <b>{s.name}</b>
            {s.role && <span>{s.role}</span>}
          </div>
        </button>
      ))}
    </>
  );
}

function DateTimeStep({ selectedDate, onDateChange, availability, loading, error, onSelectSlot, onBack }: {
  selectedDate: string;
  onDateChange: (d: string) => void;
  availability: AvailabilityInfo | undefined;
  loading: boolean;
  error: unknown;
  onSelectSlot: (slot: SlotInfo) => void;
  onBack: () => void;
}) {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, d };
  });

  return (
    <>
      <button className="bk-back" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bk-slots-head">Pick a day</div>
      <div className="bk-dates">
        {dates.map(({ key, d }) => (
          <button key={key} className={`bk-date ${selectedDate === key ? "on" : ""}`} onClick={() => onDateChange(key)}>
            <div className="dow">{DAY_SHORT[d.getDay()]}</div>
            <div className="day">{d.getDate()}</div>
            <div className="mon">{MON_SHORT[d.getMonth()]}</div>
          </button>
        ))}
      </div>

      {selectedDate && (
        <>
          <div className="bk-slots-head">
            Available times · {availability?.timezone ?? "business timezone"}
          </div>
          <div className="bk-slots">
            {loading ? (
              <div className="bk-empty">Checking availability...</div>
            ) : error ? (
              <div className="bk-empty">Failed to load slots. Please try another day.</div>
            ) : availability?.slots?.length ? (
              availability.slots.map((slot, idx) => (
                <button key={idx} className="bk-slot" onClick={() => onSelectSlot(slot)}>
                  {slot.displayStart}
                </button>
              ))
            ) : (
              <div className="bk-empty">
                {availability?.noAvailabilityReason || "No available times on this day"}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function DetailsStep({ organizationSlug, service, staff, slot, date, policies, onConfirm, onBack }: {
  organizationSlug: string;
  service: ServiceInfo | null;
  staff: StaffInfo | null;
  slot: SlotInfo | null;
  date: string;
  policies: PoliciesInfo | undefined;
  onConfirm: (result: BookingResult) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  const createBooking = trpc.public.createBooking.useMutation({
    onSuccess: (data) => onConfirm(data),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !slot) return;
    setError("");
    createBooking.mutate({
      organizationSlug,
      serviceId: service.id,
      staffId: staff?.id || undefined,
      startsAt: slot.startISO,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerNotes: notes || undefined,
      consentGiven: consent,
    });
  };

  return (
    <form className="bk-form" onSubmit={handleSubmit}>
      <button type="button" className="bk-back" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bk-summary">
        <b>{service?.name}</b>
        <span>{staff?.name || "Any professional"} · {date} at {slot?.displayStart}</span>
        <div className="pr">AED {((service?.priceFils ?? 0) / 100).toFixed(0)}</div>
      </div>

      <div className="f">
        <label>Full name</label>
        <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
      </div>
      <div className="f">
        <label>Email</label>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
      </div>
      <div className="f">
        <label>Phone</label>
        <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+971 50 123 4567" />
      </div>
      <div className="f">
        <label>Notes (optional)</label>
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know..." />
      </div>

      {(policies?.bookingTerms || policies?.privacyNotice) && (
        <div className="bk-policies">
          {policies.bookingTerms && <p>{policies.bookingTerms}</p>}
          {policies.privacyNotice && <p style={{ marginTop: 6 }}>{policies.privacyNotice}</p>}
        </div>
      )}

      <label className="bk-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required style={{ marginTop: 2 }} />
        <div>
          I agree to the booking policy and privacy notice.
          <span>Free cancellation up to {policies?.cancellationWindowHours ?? 24} hours before the appointment.</span>
        </div>
      </label>

      {error && <div className="bk-err">{error}</div>}

      <button type="submit" disabled={createBooking.isPending || !consent} className="bk-submit">
        {createBooking.isPending ? "Confirming..." : "Confirm booking"}
      </button>
    </form>
  );
}

function Confirmation({ organization, booking, slot, date }: {
  organization: Organization;
  booking: BookingResult | null;
  slot: SlotInfo | null;
  date: string;
}) {
  if (!booking) return <div className="bk-empty">No booking data</div>;

  return (
    <div className="bk-confirm">
      <div className="ic"><Check size={32} /></div>
      <h2>Booking confirmed!</h2>
      <p>Your appointment is now on the books</p>

      <div className="sum">
        <div className="row"><span>Reference</span><span style={{ fontFamily: "ui-monospace" }}>{booking.reference}</span></div>
        <div className="row"><span>Status</span><span>{booking.status}</span></div>
        <div className="row"><span>Service</span><span>{booking.service?.name}</span></div>
        <div className="row"><span>Professional</span><span>{booking.staffName}</span></div>
        <div className="row"><span>Date</span><span>{date}</span></div>
        <div className="row"><span>Time</span><span>{slot?.displayStart} ({booking.timezone})</span></div>
        <div className="row"><span>Total</span><span>AED {(booking.service?.priceFils / 100).toFixed(0)}</span></div>
      </div>

      <div className="bk-manage">
        <b>🔑 Manage your booking</b>
        <div style={{ marginTop: 4 }}>Use this private link to reschedule or cancel:</div>
        <a href={`/book/${organization.slug}/manage?token=${booking.manageToken}`}>Open manage page</a>
      </div>

      <div style={{ marginTop: 14, padding: 10, background: "#fef3e7", border: "1px solid #fed7aa", borderRadius: 10, fontSize: 11, color: "#9a3412" }}>
        📧 Demo notification stored internally. No real email or SMS was sent.
      </div>
    </div>
  );
}
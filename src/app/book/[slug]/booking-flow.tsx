// src/app/book/[slug]/booking-flow.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, MapPin, Phone, Sparkles, ArrowLeft, Info } from "lucide-react";

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

type ServiceInfo = {
  id: string;
  name: string;
  shortDescription: string | null;
  durationMinutes: number;
  priceFils: number;
};

type StaffInfo = { id: string | null; name: string; role?: string | null };

type SlotInfo = { startISO: string; displayStart: string } & Record<string, unknown>;

type AvailabilityInfo = {
  timezone: string;
  slots: SlotInfo[];
  noAvailabilityReason: string | null;
};

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

function tomorrowKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingFlow({ organization }: { organization: Organization }) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const { data: policies } = trpc.public.getPublicPolicies.useQuery({
    organizationId: organization.id,
  });

  const allowStaff = policies?.allowStaffSelection ?? true;

  const { data: services, isLoading: servicesLoading, error: servicesError } =
    trpc.public.listActiveServices.useQuery({ organizationId: organization.id });

  const { data: staff, isLoading: staffLoading } = trpc.public.listEligibleStaff.useQuery(
    { organizationId: organization.id, serviceId: selectedService?.id ?? "" },
    { enabled: !!selectedService?.id && allowStaff }
  );

  // Use `enabled` flag: query fires ONLY when date + service are both set.
  // This avoids undefined inputs without needing v11's `skipToken`.
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
    { key: "confirmation", label: "Confirmed" },
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
    if (allowStaff) {
      setStep("staff");
    } else {
      setSelectedStaff({ id: null, name: "Any Available Professional" });
      enterDateTime();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-3">
          <Sparkles className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">{organization.name}</h1>
        {organization.description && (
          <p className="text-stone-500 mt-1 text-sm">{organization.description}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-stone-400">
          {organization.address && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{organization.address}, {organization.city}</span>
          )}
          {organization.phone && (
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{organization.phone}</span>
          )}
        </div>
        {organization.isDemo && (
          <span className="inline-block mt-3 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
            Demo Workspace
          </span>
        )}
      </div>

      {policies && (
        <div className="flex items-center justify-center gap-2 mb-6 text-xs text-stone-500 bg-white border border-stone-200 rounded-full px-4 py-2 w-fit mx-auto">
          <Info className="w-3.5 h-3.5 text-orange-500" />
          <span>
            {todayHours?.isOpen
              ? `Open today ${todayHours.openTime}–${todayHours.closeTime} (${organization.timezone})`
              : "Closed today — see weekly hours below"}
            {" · "}Free cancellation up to {policies.cancellationWindowHours}h before
          </span>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i < currentStepIndex ? "bg-emerald-500 text-white" :
              i === currentStepIndex ? "bg-orange-500 text-white" :
              "bg-stone-200 text-stone-500"
            }`}>
              {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${i < currentStepIndex ? "bg-emerald-500" : "bg-stone-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="shadow-sm border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">{steps[currentStepIndex]?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "service" && (
            <ServiceStep
              services={services ?? []}
              loading={servicesLoading}
              error={servicesError}
              onSelect={handleServiceSelect}
            />
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
          {step === "confirmation" && (
            <ConfirmationStep
              organization={organization}
              booking={bookingResult}
              slot={selectedSlot}
              date={selectedDate}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceStep({ services, loading, error, onSelect }: {
  services: ServiceInfo[];
  loading: boolean;
  error: unknown;
  onSelect: (s: ServiceInfo) => void;
}) {
  if (loading) return <div className="text-center py-8 text-stone-500">Loading services...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Failed to load services</div>;
  if (!services.length) return <div className="text-center py-8 text-stone-500">No services available</div>;

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <button key={service.id} onClick={() => onSelect(service)}
          className="w-full text-left p-4 rounded-lg border border-stone-200 hover:border-orange-300 hover:shadow-sm transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-stone-800 group-hover:text-orange-600 transition-colors">{service.name}</h3>
              <p className="text-sm text-stone-500 mt-1">{service.shortDescription}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-stone-800">AED {(service.priceFils / 100).toFixed(0)}</p>
              <p className="text-xs text-stone-400 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />{service.durationMinutes} min
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StaffStep({ staff, loading, onSelect, onBack }: {
  staff: { id: string; name: string; role: string | null }[];
  loading: boolean;
  onSelect: (s: StaffInfo) => void;
  onBack: () => void;
}) {
  if (loading) return <div className="text-center py-8 text-stone-500">Loading staff...</div>;

  return (
    <div className="space-y-3">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <button onClick={() => onSelect({ id: null, name: "Any Available Professional" })}
        className="w-full text-left p-4 rounded-lg border border-stone-200 hover:border-orange-300 hover:shadow-sm transition-all flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-semibold">?</div>
        <div>
          <h3 className="font-medium text-stone-800">Any Available Professional</h3>
          <p className="text-sm text-stone-500">We will assign the best available staff</p>
        </div>
      </button>

      {staff.map((s) => (
        <button key={s.id} onClick={() => onSelect({ id: s.id, name: s.name, role: s.role })}
          className="w-full text-left p-4 rounded-lg border border-stone-200 hover:border-orange-300 hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
            {s.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-stone-800">{s.name}</h3>
            {s.role && <p className="text-sm text-stone-500">{s.role}</p>}
          </div>
        </button>
      ))}
    </div>
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
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <h3 className="font-medium mb-3 text-sm text-stone-600">Select a date</h3>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {dates.map((date) => {
          const d = new Date(date);
          const isSelected = selectedDate === date;
          return (
            <button key={date} onClick={() => onDateChange(date)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-center transition-all ${
                isSelected ? "bg-orange-500 text-white" : "bg-white border border-stone-200 hover:border-orange-300"
              }`}>
              <div className="text-xs font-medium">{DAY_SHORT[d.getDay()]}</div>
              <div className="text-lg font-bold">{d.getDate()}</div>
              <div className="text-xs">{d.toLocaleDateString("en", { month: "short" })}</div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <>
          <h3 className="font-medium mb-3 text-sm text-stone-600">
            Available times ({availability?.timezone ?? "business timezone"})
          </h3>

          {loading ? (
            <div className="text-center py-4 text-stone-500">Checking availability...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">Failed to load availability. Please try another date.</div>
          ) : availability?.slots?.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availability.slots.map((slot, idx) => (
                <button key={idx} onClick={() => onSelectSlot(slot)}
                  className="py-2 px-3 rounded-lg border border-stone-200 hover:border-orange-400 hover:bg-orange-50 text-sm font-medium transition-all">
                  {slot.displayStart}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-stone-500">
              {availability?.noAvailabilityReason || "No available times on this date"}
            </div>
          )}
        </>
      )}
    </div>
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
    onError: (err) => {
      console.error("Booking error:", err);
      setError(err.message);
    },
  });

  const isSubmitting = createBooking.isPending;

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Button type="button" variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="bg-stone-50 rounded-lg p-4 text-sm">
        <p className="font-medium">{service?.name}</p>
        <p className="text-stone-500">{staff?.name || "Any professional"} · {date} at {slot?.displayStart}</p>
        <p className="font-semibold mt-1">AED {((service?.priceFils ?? 0) / 100).toFixed(0)}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-stone-800">Full Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-800">Email *</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-800">Phone *</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+971 50 123 4567"
          className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-800">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none resize-none" />
      </div>

      {(policies?.bookingTerms || policies?.privacyNotice) && (
        <div className="text-[11px] leading-relaxed text-stone-500 bg-stone-50 border border-stone-200 rounded-lg p-3 max-h-28 overflow-y-auto space-y-1">
          {policies?.bookingTerms && <p>{policies.bookingTerms}</p>}
          {policies?.privacyNotice && <p>{policies.privacyNotice}</p>}
        </div>
      )}

      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required
          className="mt-1 rounded border-stone-300 text-orange-500 focus:ring-orange-300" />
        <span className="text-sm text-stone-600">
          I agree to the booking policy and privacy notice *
          {policies && (
            <span className="block text-[11px] text-stone-400 mt-0.5">
              Free cancellation up to {policies.cancellationWindowHours} hours before the appointment.
            </span>
          )}
        </span>
      </label>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <Button type="submit" disabled={isSubmitting || !consent}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-base font-semibold">
        {isSubmitting ? "Confirming..." : "Confirm Booking"}
      </Button>
    </form>
  );
}

function ConfirmationStep({ organization, booking, slot, date }: {
  organization: Organization;
  booking: BookingResult | null;
  slot: SlotInfo | null;
  date: string;
}) {
  if (!booking) return <div className="text-center py-8 text-stone-500">No booking data</div>;

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-stone-800 mb-2">Booking Confirmed!</h2>
      <p className="text-stone-500 mb-6">Your appointment has been successfully booked</p>

      <div className="bg-stone-50 rounded-lg p-4 text-left space-y-2 text-sm max-w-sm mx-auto">
        <div className="flex justify-between"><span className="text-stone-500">Reference</span><span className="font-mono font-medium">{booking.reference}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Status</span><span className="capitalize">{booking.status}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Service</span><span>{booking.service?.name}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Professional</span><span>{booking.staffName}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Date</span><span>{date}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Time</span><span>{slot?.displayStart} ({booking.timezone})</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Total</span><span className="font-semibold">AED {(booking.service?.priceFils / 100).toFixed(0)}</span></div>
      </div>

      <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 max-w-sm mx-auto break-all">
        <p className="font-medium mb-2">🔑 Manage your booking:</p>
        <a
          href={`/book/${organization.slug}/manage?token=${booking.manageToken}`}
          className="inline-block w-full text-center bg-white border border-orange-300 text-orange-600 hover:bg-orange-50 font-medium rounded-lg px-3 py-2 transition-colors"
        >
          Open manage-booking page
        </a>
        <p className="text-[10px] text-stone-400 mt-2">Token: {booking.manageToken}</p>
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 max-w-sm mx-auto">
        📧 Demo notification stored internally. No real email or SMS was sent.
      </div>

      <p className="text-xs text-stone-400 mt-4">
        Cancellation available up to 24 hours before your appointment.
      </p>
    </div>
  );
}
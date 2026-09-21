// src/db/seed.ts
import "./env";
import { db } from "./index";
import { nanoid } from "nanoid";
import { addDays, format } from "date-fns";
import { eq } from "drizzle-orm";
import { users } from "./schema/users";
import { organizations, organizationMembers, bookingPolicies } from "./schema/organizations";
import { services, serviceCategories } from "./schema/services";
import { staffProfiles, staffServices } from "./schema/staff";
import { businessHours, breakPeriods, businessHolidays, staffTimeOff, staffHours } from "./schema/availability";
import { customers } from "./schema/customers";
import { appointments, appointmentStatusHistory } from "./schema/appointments";
import { notificationEvents } from "./schema/notifications";

async function seed() {
  console.log("🌱 Seeding Bookwise demo data...");

  // Owner user (dedupe-safe)
  let userRow = await db.query.users.findFirst({ where: eq(users.email, "owner@bookwise.demo") });
  if (!userRow) {
    const id = nanoid();
    await db.insert(users).values({ id, name: "Demo Owner", email: "owner@bookwise.demo" });
    userRow = await db.query.users.findFirst({ where: eq(users.email, "owner@bookwise.demo") });
  }
  const userId = userRow!.id;

  const existingOrg = await db.query.organizations.findFirst({ where: eq(organizations.slug, "demo-salon") });
  if (existingOrg) {
    console.log("⚠️ Demo workspace already exists — seed skipped.");
    return;
  }

  const orgId = nanoid();
  await db.insert(organizations).values({
    id: orgId,
    name: "Luna Wellness Studio Dubai",
    slug: "demo-salon",
    description: "Premium beauty, wellness, and self-care studio in the heart of Dubai.",
    timezone: "Asia/Dubai",
    currency: "AED",
    phone: "+971 4 123 4567",
    email: "hello@lunawellness.ae",
    address: "Al Wasl Road, Jumeirah 1",
    city: "Dubai",
    country: "AE",
    isActive: true,
    isDemo: true,
    settings: {
      slotInterval: 30,
      minimumNoticeMinutes: 60,
      maxBookingDaysAhead: 30,
      defaultCancellationWindowHours: 24,
      defaultBufferMinutes: 15,
      allowStaffSelection: true,
      taxRatePercent: 5,
    },
  });

  await db.insert(organizationMembers).values({
    id: nanoid(), organizationId: orgId, userId, role: "owner", isActive: true,
  });

  await db.insert(bookingPolicies).values({
    id: nanoid(), organizationId: orgId,
    cancellationWindowHours: 24, rescheduleWindowHours: 24,
    autoConfirmBookings: true,
    privacyNotice: "Your data is handled according to UAE data protection regulations (PDPL).",
    bookingTerms: "Cancellations and reschedules are free up to 24 hours before the appointment.",
  });

  // Categories
  const catFace = nanoid(), catBody = nanoid(), catNails = nanoid(), catHair = nanoid(), catSpecial = nanoid();
  await db.insert(serviceCategories).values([
    { id: catFace, organizationId: orgId, name: "Facial Treatments", displayOrder: 1 },
    { id: catBody, organizationId: orgId, name: "Body & Massage", displayOrder: 2 },
    { id: catNails, organizationId: orgId, name: "Nail Care", displayOrder: 3 },
    { id: catHair, organizationId: orgId, name: "Hair Services", displayOrder: 4 },
    { id: catSpecial, organizationId: orgId, name: "Special Occasions", displayOrder: 5 },
  ]);

  // Services
  const svcFacial = nanoid(), svcMassage = nanoid(), svcManicure = nanoid(), svcHair = nanoid(), svcBridal = nanoid();
  await db.insert(services).values([
    { id: svcFacial, organizationId: orgId, categoryId: catFace, name: "Signature Facial", slug: "signature-facial", shortDescription: "Luxury facial with premium products", durationMinutes: 60, priceFils: 22000, bufferAfterMinutes: 15, displayOrder: 1 },
    { id: svcMassage, organizationId: orgId, categoryId: catBody, name: "Deep Tissue Massage", slug: "deep-tissue-massage", shortDescription: "Therapeutic deep pressure massage", durationMinutes: 75, priceFils: 30000, bufferAfterMinutes: 15, displayOrder: 2 },
    { id: svcManicure, organizationId: orgId, categoryId: catNails, name: "Express Manicure", slug: "express-manicure", shortDescription: "Quick and beautiful nail care", durationMinutes: 45, priceFils: 12000, displayOrder: 3 },
    { id: svcHair, organizationId: orgId, categoryId: catHair, name: "Hair Styling", slug: "hair-styling", shortDescription: "Professional cut and style", durationMinutes: 60, priceFils: 18000, bufferAfterMinutes: 10, displayOrder: 4 },
    { id: svcBridal, organizationId: orgId, categoryId: catSpecial, name: "Bridal Consultation", slug: "bridal-consultation", shortDescription: "Complete bridal beauty planning", durationMinutes: 90, priceFils: 40000, bufferAfterMinutes: 30, displayOrder: 5 },
  ]);

  // Staff + weekly schedules (Mon-Sat)
  const sSara = nanoid(), sLayla = nanoid(), sNour = nanoid(), sOmar = nanoid();
  await db.insert(staffProfiles).values([
    { id: sSara, organizationId: orgId, name: "Sara Ahmed", slug: "sara-ahmed", role: "Senior Therapist", bio: "10+ years in facial and body treatments", displayOrder: 1 },
    { id: sLayla, organizationId: orgId, name: "Layla Hassan", slug: "layla-hassan", role: "Hair Stylist", bio: "Bridal and editorial styling specialist", displayOrder: 2 },
    { id: sNour, organizationId: orgId, name: "Nour Ali", slug: "nour-ali", role: "Nail Artist", bio: "Creative nail art and care", displayOrder: 3 },
    { id: sOmar, organizationId: orgId, name: "Omar Khalid", slug: "omar-khalid", role: "Massage Therapist", bio: "Certified deep tissue therapist", displayOrder: 4 },
  ]);

  const schedules = [
    { id: sSara, open: 9, close: 18 },
    { id: sLayla, open: 12, close: 20 },
    { id: sNour, open: 9, close: 15 },
    { id: sOmar, open: 10, close: 19 },
  ];

  await db.insert(staffServices).values([
    { id: nanoid(), staffId: sSara, serviceId: svcFacial },
    { id: nanoid(), staffId: sSara, serviceId: svcMassage },
    { id: nanoid(), staffId: sSara, serviceId: svcBridal },
    { id: nanoid(), staffId: sLayla, serviceId: svcHair },
    { id: nanoid(), staffId: sLayla, serviceId: svcBridal },
    { id: nanoid(), staffId: sNour, serviceId: svcManicure },
    { id: nanoid(), staffId: sOmar, serviceId: svcMassage },
    { id: nanoid(), staffId: sOmar, serviceId: svcFacial },
  ]);

  for (const s of schedules) {
    for (let day = 1; day <= 6; day++) {
      await db.insert(staffHours).values({
        id: nanoid(), staffId: s.id, dayOfWeek: day, isOpen: true,
        openTime: `${String(s.open).padStart(2, "0")}:00`,
        closeTime: `${String(s.close).padStart(2, "0")}:00`,
      });
      await db.insert(breakPeriods).values({
        id: nanoid(), staffId: s.id, dayOfWeek: day, startTime: "13:00", endTime: "14:00", label: "Lunch Break",
      });
    }
  }

  // Business hours (Sun 10-18, Mon-Sat 09-20)
  for (let day = 0; day < 7; day++) {
    await db.insert(businessHours).values({
      id: nanoid(), organizationId: orgId, dayOfWeek: day, isOpen: true,
      openTime: day === 0 ? "10:00" : "09:00",
      closeTime: day === 0 ? "18:00" : "20:00",
    });
  }

  const closureDate = format(addDays(new Date(), 10), "yyyy-MM-dd");
  await db.insert(businessHolidays).values({
    id: nanoid(), organizationId: orgId, date: closureDate, name: "Studio Maintenance Closure", isRecurring: false,
  });

  await db.insert(staffTimeOff).values({
    id: nanoid(), staffId: sOmar,
    startDate: addDays(new Date(), 7), endDate: addDays(new Date(), 9),
    reason: "Annual vacation",
  });

  // Customers (stats start at zero; recomputed from real appointments below)
  const names = [
    "Fatima Al Rashid", "Ahmed Khan", "Maryam Saeed", "Hessa Rahman", "Dana Mohammed",
    "Ali Mansour", "Sara Johnson", "Khalid Bin Tariq", "Noor Al Farsi", "Rania Hassan",
    "Youssef Ibrahim", "Layla Mahmoud", "Omar Farooq", "Aisha Patel", "Zainab Ali",
    "Hamad Al Suwaidi", "Priya Sharma", "Mohammed Al Qasimi", "Reem Khalifa", "Tariq Hussein",
    "Amira Nassar", "Faisal Al Maktoum", "Huda Kattan", "Salma Aziz", "Nadia Karim",
    "Rashid Al Thani", "Maha Al Sabah", "Jasim Al Nuaimi", "Shamsa Al Dhaheri", "Latifa Al Ketbi",
  ];
  const customerIds: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const id = nanoid();
    customerIds.push(id);
    const email = names[i].toLowerCase().replace(/\s+/g, ".") + "@email.com";
    const phone = `+97150${1000000 + i * 137}`;
    await db.insert(customers).values({
      id, organizationId: orgId, name: names[i], email, phone,
      normalizedEmail: email, normalizedPhone: phone,
      consentGiven: true,
      totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0,
      noShowCount: 0, totalSpentFils: 0,
    });
  }

  // ---- Schedule-valid appointments ----
  const SVC = [
    { id: svcFacial, dur: 60, price: 22000, staff: [sSara, sOmar] },
    { id: svcMassage, dur: 75, price: 30000, staff: [sSara, sOmar] },
    { id: svcManicure, dur: 45, price: 12000, staff: [sNour] },
    { id: svcHair, dur: 60, price: 18000, staff: [sLayla] },
    { id: svcBridal, dur: 90, price: 40000, staff: [sSara, sLayla] },
  ];
  const placed = new Map<string, { start: number; end: number }[]>();
  const stats = new Map<string, { total: number; done: number; cancel: number; noShow: number; spent: number; last: Date }>();

  const pastStatuses = ["completed", "completed", "completed", "cancelled", "no_show"];
  const futureStatuses = ["confirmed", "confirmed", "pending", "confirmed"];

  let seq = 0;
  for (let dayOffset = -3; dayOffset <= 6; dayOffset++) {
    const date = addDays(new Date(), dayOffset);
    const dateStr = format(date, "yyyy-MM-dd");
    if (dateStr === closureDate) continue;
    if (date.getDay() === 0) continue; // staff schedules are Mon-Sat

    for (let si = 0; si < schedules.length; si++) {
      const staff = schedules[si];
      if (staff.id === sOmar && dayOffset >= 7 && dayOffset <= 9) continue; // time off

      for (let k = 0; k < 2; k++) {
        const candidates = SVC.filter((s) => s.staff.includes(staff.id));
        const service = candidates[(seq + k) % candidates.length];

        let chosen: number | null = null;
        for (let m = staff.open * 60 + (seq % 2) * 30; m + service.dur <= staff.close * 60; m += 60) {
          if (dayOffset === 0 && m < (new Date().getHours() + 1) * 60) continue; // keep future today
          const sMin = m, eMin = m + service.dur;
          if (sMin < 14 * 60 && eMin > 13 * 60) continue; // lunch break
          const list = placed.get(`${dateStr}|${staff.id}`) ?? [];
          if (list.some((p) => sMin < p.end + 15 && eMin > p.start - 15)) continue; // 15m buffer
          chosen = m;
          break;
        }
        if (chosen === null) continue;

        const list = placed.get(`${dateStr}|${staff.id}`) ?? [];
        placed.set(`${dateStr}|${staff.id}`, [...list, { start: chosen, end: chosen + service.dur }]);

        const start = new Date(date);
        start.setHours(Math.floor(chosen / 60), chosen % 60, 0, 0);
        const end = new Date(start.getTime() + service.dur * 60000);

        const status = dayOffset < 0
          ? pastStatuses[seq % pastStatuses.length]
          : futureStatuses[seq % futureStatuses.length];

        const customerId = customerIds[seq % customerIds.length];
        const aptId = nanoid();

        await db.insert(appointments).values({
          id: aptId, organizationId: orgId,
          serviceId: service.id, staffId: staff.id, customerId,
          startsAt: start, endsAt: end, status,
          priceFils: service.price,
          paymentStatus: status === "completed" ? "paid" : "not_required",
          manageToken: nanoid(32),
          cancelledAt: status === "cancelled" ? new Date() : null,
        });
        await db.insert(appointmentStatusHistory).values({
          id: nanoid(), appointmentId: aptId, fromStatus: null, toStatus: status, changedBy: "system",
        });

        const st = stats.get(customerId) ?? { total: 0, done: 0, cancel: 0, noShow: 0, spent: 0, last: start };
        st.total += 1;
        if (status === "completed") { st.done += 1; st.spent += service.price; }
        if (status === "cancelled") st.cancel += 1;
        if (status === "no_show") st.noShow += 1;
        if (start > st.last) st.last = start;
        stats.set(customerId, st);

        seq++;
      }
    }
  }

  // Recompute customer stats from the appointments we actually created
  for (const [customerId, st] of stats.entries()) {
    await db.update(customers).set({
      totalAppointments: st.total,
      completedAppointments: st.done,
      cancelledAppointments: st.cancel,
      noShowCount: st.noShow,
      totalSpentFils: st.spent,
      lastAppointmentAt: st.last,
    }).where(eq(customers.id, customerId));
  }

  // Demo notifications
  const types = ["booking_created", "booking_confirmed", "appointment_reminder", "booking_cancelled"];
  for (let i = 0; i < 12; i++) {
    await db.insert(notificationEvents).values({
      id: nanoid(), organizationId: orgId, type: types[i % 4],
      recipientType: "customer",
      recipientEmail: names[i].toLowerCase().replace(/\s+/g, ".") + "@email.com",
      subject: `Appointment ${types[i % 4].replace(/_/g, " ")}`,
      body: "Demo notification record. No real delivery happened.",
      channel: "internal", deliveryStatus: "demo",
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Appointments created: ${seq} (all respect staff hours, breaks & buffers)`);
  console.log("   Public booking page: /book/demo-salon");
  console.log("   Owner login: owner@bookwise.demo");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
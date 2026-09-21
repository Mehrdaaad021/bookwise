# Bookwise — Booking & Appointment SaaS (Demo)

A production-style multi-tenant booking platform for service businesses (salons, clinics,
studios) in the UAE/GCC region. Built as a portfolio-grade demo with a fully working
public booking flow, a protected business workspace, and a server-authoritative
scheduling engine.

## ✨ Features

### Public booking (`/book/[slug]`)
- Business profile by slug with demo-workspace labeling
- Service catalog with duration, price (AED), and buffers
- Professional selection (or "any available")
- Real-time availability computed server-side per business timezone
- Transactional booking creation with double-booking prevention
- Manage-booking page via opaque token: view + policy-aware cancellation

### Business workspace (`/dashboard`)
- Overview: today's load, customers, completed revenue, upcoming appointments
- Calendar: day & week views in business timezone
- Appointments: filters (status/date/search) + lifecycle actions
  (confirm → check-in → start → complete, cancel, no-show) with transition rules
- Services: create, price, assign staff, hide, archive
- Staff: create, activate/deactivate, assign services
- Customers: search + lifetime stats + full booking history
- Reports: revenue per day, top services, status breakdown, staff load (7/30/90 days)
- Availability: weekly business hours, holidays, staff time-off, recurring breaks
- Settings: slot interval, notice window, booking window, tax, policies,
  temporary closure toggle

## 🧠 Scheduling engine
- All timestamps stored in UTC; business IANA timezone used for logic & display
- Overlap rule: `existingStart < requestedEnd AND existingEnd > requestedStart`
- Considers: business hours, staff hours, breaks, holidays, time-off,
  existing appointments, per-staff daily caps, buffers, minimum notice,
  booking window, temporary closures
- DST-safe via `date-fns-tz` (no manual offsets)
- Unit-tested with Vitest (22 tests)

## 🔐 Security model
- NextAuth (JWT sessions) with Drizzle adapter (OAuth-ready schema)
- Organization-scoped authorization on every workspace procedure
  (`requireOrgMembership`) + role guards (`owner/manager/staff`)
- Public manage links use opaque unguessable tokens (no ID enumeration)
- Server-side re-validation of slots inside DB transactions
- Zod validation on every input

## 🛠 Tech stack
Next.js (App Router) · TypeScript · tRPC · Drizzle ORM · Neon Postgres (serverless) ·
NextAuth · Zod · date-fns/date-fns-tz · Tailwind + shadcn/ui · Vitest

## 🚀 Quick start
1. `npm install`
2. Create `.env.local` from `.env.example` (Neon connection string + secrets)
3. `npm run db:push` — create schema in Neon
4. `npm run seed` — load demo workspace (Luna Wellness Studio Dubai)
5. `npm run dev` — open http://localhost:3000

### Demo credentials
- Owner login: `owner@bookwise.demo` (any email works in demo mode)
- Public booking: `/book/demo-salon`

## 🧰 Scripts
- `npm run dev` — development server
- `npm test` — Vitest suite
- `npm run db:push` — push schema to Neon
- `npm run db:generate` — generate SQL migrations
- `npm run seed` — seed demo data

## ⚠️ Honest demo limitations
- Notifications are stored internally and labeled "demo" — no real email/SMS is sent
- Payments are not processed; deposits are modeled but not charged
- Rate limiting and production hardening are documented, not enforced
- Single-region Neon branch; no CDN/edge caching configured

## 📚 Docs
- `docs/architecture.md` — system design & data model
- `docs/decisions.md` — key engineering decisions & trade-offs
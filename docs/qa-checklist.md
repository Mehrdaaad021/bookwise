# Manual QA Checklist (executed on 2026-09-21)

Every item below was manually verified end-to-end against a live Neon database.

## Public booking
- [x] Business page loads by slug with demo badge and live info strip (hours + cancellation window)
- [x] Service list shows only active, non-archived services with AED prices
- [x] Professional list respects service eligibility; "Any Available" auto-assigns server-side
- [x] `allowStaffSelection=false` removes the professional step entirely (4-step wizard)
- [x] Availability respects business hours, staff hours, lunch breaks, buffers, holidays, time-off
- [x] Closed days / holidays / temporary closure show honest no-availability reasons
- [x] Booking creates appointment transactionally; confirmation shows reference + manage token
- [x] Double-booking prevented: booked slot disappears for everyone immediately
- [x] Rate limit: 6th booking attempt within 10 minutes returns TOO_MANY_REQUESTS
- [x] Invalid slug renders branded 404 page

## Manage booking (customer)
- [x] Opaque token link opens booking details (no ID enumeration)
- [x] Cancel blocked inside cancellation window with policy message
- [x] Cancel allowed outside window; status flips to cancelled; slot frees up
- [x] Reschedule shows only valid future slots for the assigned professional
- [x] Reschedule inside window blocked by policy; outside window succeeds and moves appointment
- [x] Cancelled booking shows terminal state (no actions)

## Workspace (owner)
- [x] Login redirects unauthenticated users; session survives refresh
- [x] Overview KPIs match database aggregates (today count, customers, completed revenue)
- [x] Calendar day/week views render appointments in business timezone
- [x] Appointment lifecycle: confirm → check-in → start → complete, with timeline drawer
- [x] Invalid transitions rejected server-side (e.g., complete → confirm)
- [x] Services: create/hide/archive; archived services vanish from public page
- [x] Staff: create/deactivate; deactivated staff vanish from public selection
- [x] Customers: search + lifetime stats consistent with booking history
- [x] Reports: revenue/day chart, top services, staff load match appointment data
- [x] Availability: hours edit, holiday add/remove, time-off, breaks all affect public slots
- [x] Settings: slot interval, notice, window, tax, policies, temporary closure all enforced
- [x] Audit log records every sensitive mutation with actor + timestamp (owner-only view)

## Platform
- [x] `/api/health` returns 200 with db latency; 503 when db unreachable
- [x] Security headers present (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
- [x] `npx tsc --noEmit` → 0 errors
- [x] `npx eslint .` → 0 problems
- [x] `npm test` → all suites green (scheduling engine, status machine, money)
- [x] CI workflow runs typecheck + tests + lint on push
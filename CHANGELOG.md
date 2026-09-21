# Changelog

All notable changes to this project are documented here.
Format follows Keep a Changelog; versioning follows Semantic Versioning.

## [1.0.0] - 2026-09-21

### Added
- Public booking flow: service catalog, professional selection (respecting
  `allowStaffSelection`), server-computed availability, transactional booking
  with double-booking prevention
- Manage-booking via opaque token: view, policy-aware cancellation,
  reschedule with full slot re-validation
- Business workspace: overview KPIs, day/week calendar, appointments list with
  lifecycle actions and forensic status timeline, services/staff CRUD,
  customers with lifetime stats, reports (revenue/day, top services, staff
  load), availability management (hours, holidays, breaks, time-off),
  settings with booking policies and temporary closure
- Security: org-scoped authorization, role guards (owner/manager/staff),
  Zod validation on all inputs, in-memory rate limiting on public mutations,
  security headers, `/api/health` probe
- Owner-only audit trail for sensitive mutations
- Timezone-safe scheduling engine (IANA) with buffers, breaks, holidays,
  time-off and daily caps; unit-tested with Vitest
- Demo seed producing schedule-consistent data with recomputed customer stats
- CI pipeline: typecheck + unit tests + lint

### Known limitations (documented honestly)
- Notifications are demo-labeled records behind a swappable provider interface
  (no real email/SMS delivery)
- Rate limiting is single-instance in-memory (production: Redis/edge)
- Payments modeled (deposits, payment status) but not processed
- Full CSP deferred to production hardening (needs nonce pipeline)
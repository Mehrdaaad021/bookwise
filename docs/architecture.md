# Architecture

## Layers
1. **UI (Next.js App Router)** — server components for auth gates & SEO-safe public pages;
   client components for interactive flows (booking wizard, workspace).
2. **tRPC API** — type-safe procedures grouped by domain:
   `public`, `workspace`, `services`, `staff`, `customers`, `reports`, `settings`, `availability`.
3. **Domain logic** — `src/lib/scheduling` (pure, testable), `src/lib/validations` (Zod + status machine).
4. **Data** — Drizzle ORM over Neon Postgres; relational queries + explicit transactions.

## Data model (core)
- `organizations` (settings JSONB) → members, booking policies
- `services` (+categories) ↔ `staff_profiles` via `staff_services`
- Availability: `business_hours`, `staff_hours`, `break_periods`, `business_holidays`, `staff_time_off`
- `customers` (org-scoped, normalized email/phone for dedupe)
- `appointments` (+ status history, notes) with opaque `manage_token`
- `notification_events` (demo delivery), `audit_logs`

## Timezone policy
- Store: UTC timestamps.
- Compute & display: business IANA timezone (`organizations.timezone`).
- Day boundaries derived with `fromZonedTime`; DST-safe by construction.

## Booking consistency
1. Engine generates slots from full context (hours, breaks, holidays, time-off, appointments).
2. On create: policy checks → staff assignment → **transaction** with interval re-check
   (`start < existingEnd AND end > existingStart`) → customer dedupe → writes:
   appointment + status history + demo notification, atomically.
3. Cancellation/reschedule enforced by cancellation window + status transition table.

## AuthZ
- Session: NextAuth JWT (credentials demo; adapter ready for OAuth).
- Every workspace procedure: `requireOrgMembership(ctx, organizationId)` then optional
  `assertRole(...)` for owner/manager-only mutations.
- Public manage flows: opaque token lookup only.

## Status machine
pending → confirmed → checked_in → in_progress → completed
Any of pending/confirmed/checked_in/in_progress → cancelled (policy window)
confirmed/checked_in → no_show
Terminal: completed, cancelled, no_show
# Key Decisions & Trade-offs

1. **Neon serverless driver (WebSocket) instead of neon-http**
   Why: HTTP driver has no transaction support; booking integrity requires atomic
   multi-table writes with re-checks. Trade-off: connection pooling considerations
   in serverless deployments (acceptable for demo scale).

2. **JWT session strategy**
   Why: stateless server reads, no session DB lookups per request; Drizzle adapter
   tables kept so OAuth providers can be added without schema changes.

3. **Credentials demo auth (any email creates a demo user)**
   Why: frictionless portfolio demo. Trade-off: not for production; production path
   documented (OAuth + email verification).

4. **Prices as integer fils**
   Why: avoid float rounding errors in money math. Display divides by 100.

5. **Opaque manage tokens**
   Why: prevent ID enumeration on public manage links; tokens are unguessable
   (nanoid 32) and stored hashed-at-rest equivalent (unique index).

6. **Server-authoritative scheduling**
   Why: clients never compute availability; prevents tampering and drift.
   Trade-off: extra server round-trips (batched via tRPC).

7. **Demo-labeled notifications**
   Why: honesty — no real email/SMS provider is configured; records exist so the
   notification pipeline is demonstrable and swappable (Resend/Twilio later).

8. **Domain-split tRPC routers**
   Why: keep files small, ownership clear, and procedures discoverable.

9. **Vitest for the scheduling engine**
   Why: overlap/timezone/buffer rules are pure functions — ideal for unit tests;
   22 tests act as an executable specification.

10. **shadcn/ui (Base UI variant)**
    Note: Base UI components do not use Radix `asChild`; triggers render their own
    button. Learned during implementation (nested-button hydration fix).
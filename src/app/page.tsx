// src/app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  CalendarClock, ShieldCheck, BarChart3, Users, ScrollText, Zap,
  ArrowRight, Sparkles, CheckCircle2, Lock, Globe2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.bw-l { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f7f6f3; color: #171512; -webkit-font-smoothing: antialiased; }
.bw-l * { box-sizing: border-box; }
.bw-l a { text-decoration: none; color: inherit; }
.bw-nav { position: sticky; top: 0; z-index: 20; background: rgba(247,246,243,.85); backdrop-filter: blur(10px); border-bottom: 1px solid #e8e5df; }
.bw-nav-in { max-width: 1120px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.bw-logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; letter-spacing: -0.02em; }
.bw-logo-mark { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; color: #fff; }
.bw-nav-links { display: flex; gap: 26px; font-size: 14px; font-weight: 500; color: #57534e; }
.bw-nav-links a:hover { color: #171512; }
.bw-nav-cta { display: flex; gap: 10px; align-items: center; }
.bw-btn { display: inline-flex; align-items: center; gap: 8px; border-radius: 10px; font-weight: 600; font-size: 14px; padding: 10px 18px; transition: all .15s; border: 1px solid transparent; cursor: pointer; }
.bw-btn-primary { background: #171512; color: #fff; }
.bw-btn-primary:hover { background: #292524; transform: translateY(-1px); }
.bw-btn-ghost { background: #fff; border-color: #e0ddd6; color: #171512; }
.bw-btn-ghost:hover { border-color: #c9c5bc; transform: translateY(-1px); }
.bw-hero { max-width: 1120px; margin: 0 auto; padding: 88px 24px 64px; text-align: center; }
.bw-badge { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e8e5df; border-radius: 999px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; color: #78716c; }
.bw-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
.bw-h1 { margin: 26px auto 0; max-width: 760px; font-size: clamp(38px, 6vw, 62px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.04; }
.bw-h1 em { font-style: normal; color: #ea580c; }
.bw-sub { margin: 22px auto 0; max-width: 620px; font-size: 17.5px; line-height: 1.65; color: #57534e; }
.bw-hero-cta { margin-top: 34px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.bw-stats { margin: 56px auto 0; display: flex; gap: 40px; justify-content: center; flex-wrap: wrap; }
.bw-stat { text-align: center; }
.bw-stat b { display: block; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.bw-stat span { font-size: 12.5px; color: #78716c; font-weight: 500; }
.bw-sec { max-width: 1120px; margin: 0 auto; padding: 72px 24px; }
.bw-sec-head { text-align: center; margin-bottom: 44px; }
.bw-sec-head h2 { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; }
.bw-sec-head p { margin-top: 10px; color: #57534e; font-size: 15.5px; }
.bw-live { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.bw-live a { background: #fff; border: 1px solid #e8e5df; border-radius: 16px; padding: 26px; display: flex; flex-direction: column; gap: 12px; transition: all .18s; }
.bw-live a:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(23,21,18,.08); border-color: #d6d2c9; }
.bw-live .ico { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; }
.bw-live h3 { font-size: 16.5px; font-weight: 700; letter-spacing: -0.015em; }
.bw-live p { font-size: 13.5px; line-height: 1.6; color: #57534e; flex: 1; }
.bw-live .go { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #ea580c; }
.bw-feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.bw-feat { background: #fff; border: 1px solid #e8e5df; border-radius: 16px; padding: 24px; }
.bw-feat .ico { width: 38px; height: 38px; border-radius: 10px; background: #fef3e7; color: #ea580c; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.bw-feat h3 { font-size: 15.5px; font-weight: 700; }
.bw-feat p { margin-top: 8px; font-size: 13.5px; line-height: 1.6; color: #57534e; }
.bw-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; counter-reset: step; }
.bw-step { position: relative; background: #fff; border: 1px solid #e8e5df; border-radius: 16px; padding: 26px; }
.bw-step .num { font-size: 13px; font-weight: 800; color: #ea580c; letter-spacing: .08em; }
.bw-step h3 { margin-top: 10px; font-size: 16px; font-weight: 700; }
.bw-step p { margin-top: 8px; font-size: 13.5px; line-height: 1.6; color: #57534e; }
.bw-dark { background: #141210; color: #f5f4f2; border-radius: 24px; padding: 56px 48px; display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center; }
.bw-dark h2 { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; }
.bw-dark p { margin-top: 14px; color: #a8a29e; font-size: 15px; line-height: 1.65; }
.bw-dark ul { list-style: none; display: grid; gap: 14px; }
.bw-dark li { display: flex; gap: 12px; align-items: flex-start; font-size: 14px; line-height: 1.55; color: #e7e5e4; }
.bw-dark li svg { flex-shrink: 0; margin-top: 2px; color: #4ade80; }
.bw-foot { border-top: 1px solid #e8e5df; }
.bw-foot-in { max-width: 1120px; margin: 0 auto; padding: 28px 24px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #78716c; }
@media (max-width: 900px) {
  .bw-live, .bw-feats, .bw-steps { grid-template-columns: 1fr; }
  .bw-dark { grid-template-columns: 1fr; padding: 36px 26px; }
  .bw-nav-links { display: none; }
}
`;

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="bw-l">
      <style>{css}</style>

      <nav className="bw-nav">
        <div className="bw-nav-in">
          <div className="bw-logo">
            <span className="bw-logo-mark"><Sparkles size={16} /></span>
            Bookwise
          </div>
          <div className="bw-nav-links">
            <a href="#live">Live demo</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#security">Security</a>
          </div>
          <div className="bw-nav-cta">
            <Link href="/login" className="bw-btn bw-btn-ghost">Sign in</Link>
            <Link href="/book/demo-salon" className="bw-btn bw-btn-primary">Book a demo</Link>
          </div>
        </div>
      </nav>

      <header className="bw-hero">
        <span className="bw-badge"><span className="dot" /> v1.0 is live — try the real product below</span>
        <h1 className="bw-h1">Appointments that <em>run themselves.</em></h1>
        <p className="bw-sub">
          Bookwise is a booking platform for UAE service businesses: a timezone-safe
          scheduling engine, policy-aware cancellations, and a workspace your whole
          team can run — without double bookings, ever.
        </p>
        <div className="bw-hero-cta">
          <Link href="/book/demo-salon" className="bw-btn bw-btn-primary">
            Book an appointment <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="bw-btn bw-btn-ghost">Open the workspace</Link>
        </div>
        <div className="bw-stats">
          <div className="bw-stat"><b>30</b><span>unit tests, all green</span></div>
          <div className="bw-stat"><b>0</b><span>double bookings by design</span></div>
          <div className="bw-stat"><b>UTC</b><span>storage, IANA display</span></div>
          <div className="bw-stat"><b>3</b><span>roles with real permissions</span></div>
        </div>
      </header>

      <section className="bw-sec" id="live">
        <div className="bw-sec-head">
          <h2>Don&apos;t take our word for it — use it</h2>
          <p>Every surface below is the actual running product, not a screenshot.</p>
        </div>
        <div className="bw-live">
          <Link href="/book/demo-salon">
            <span className="ico" style={{ background: "#fef3e7", color: "#ea580c" }}><CalendarClock size={20} /></span>
            <h3>Public booking page</h3>
            <p>Pick a service, see real availability computed from staff hours, breaks and buffers, and book in four steps.</p>
            <span className="go">Open booking flow <ArrowRight size={14} /></span>
          </Link>
          <Link href="/book/demo-salon/manage?token=invalid">
            <span className="ico" style={{ background: "#eef7ee", color: "#16a34a" }}><CheckCircle2 size={20} /></span>
            <h3>Manage a booking</h3>
            <p>Customers reschedule or cancel from a private token link — enforced by the business&apos;s policy windows.</p>
            <span className="go">See the manage page <ArrowRight size={14} /></span>
          </Link>
          <Link href="/login">
            <span className="ico" style={{ background: "#eef2ff", color: "#4f46e5" }}><Users size={20} /></span>
            <h3>Owner workspace</h3>
            <p>Calendar, lifecycle actions, customers, reports, availability and an owner-only audit trail. Demo logins listed on the sign-in page.</p>
            <span className="go">Sign in <ArrowRight size={14} /></span>
          </Link>
        </div>
      </section>

      <section className="bw-sec" id="features">
        <div className="bw-sec-head">
          <h2>Built like infrastructure, not a toy</h2>
          <p>The hard parts are handled server-side, where they belong.</p>
        </div>
        <div className="bw-feats">
          <div className="bw-feat">
            <span className="ico"><CalendarClock size={18} /></span>
            <h3>Timezone-safe scheduling</h3>
            <p>Timestamps stored in UTC, boundaries computed in the business&apos;s IANA timezone. DST changes can&apos;t corrupt your calendar.</p>
          </div>
          <div className="bw-feat">
            <span className="ico"><Lock size={18} /></span>
            <h3>No double bookings</h3>
            <p>Every booking re-validates interval overlap inside a database transaction, so two simultaneous clicks can&apos;t steal one slot.</p>
          </div>
          <div className="bw-feat">
            <span className="ico"><ShieldCheck size={18} /></span>
            <h3>Policy-aware lifecycle</h3>
            <p>Cancellation and reschedule windows, minimum notice, booking horizons and temporary closure — all enforced per business.</p>
          </div>
          <div className="bw-feat">
            <span className="ico"><Users size={18} /></span>
            <h3>Real roles</h3>
            <p>Owner, manager and staff see different navigation and, more importantly, different API permissions. Invite-only accounts.</p>
          </div>
          <div className="bw-feat">
            <span className="ico"><BarChart3 size={18} /></span>
            <h3>Reports that add up</h3>
            <p>Revenue per day, top services and staff load computed from the same appointments your calendar shows. No vanity numbers.</p>
          </div>
          <div className="bw-feat">
            <span className="ico"><ScrollText size={18} /></span>
            <h3>Owner-only audit trail</h3>
            <p>Every sensitive mutation is recorded with actor and timestamp. When something changes, you can prove who changed it.</p>
          </div>
        </div>
      </section>

      <section className="bw-sec" id="how">
        <div className="bw-sec-head">
          <h2>How a booking flows</h2>
          <p>Three steps, all validated server-side.</p>
        </div>
        <div className="bw-steps">
          <div className="bw-step">
            <span className="num">STEP 01</span>
            <h3>Customer picks a slot</h3>
            <p>Availability is generated from business hours, staff shifts, breaks, holidays, time-off and buffers — never from a static list.</p>
          </div>
          <div className="bw-step">
            <span className="num">STEP 02</span>
            <h3>Engine re-validates</h3>
            <p>On submit, the server re-checks notice windows, closure days and overlap inside a transaction before inserting anything.</p>
          </div>
          <div className="bw-step">
            <span className="num">STEP 03</span>
            <h3>Everyone stays in sync</h3>
            <p>The workspace calendar updates instantly, the customer gets a manage link, and the event lands in the audit trail.</p>
          </div>
        </div>
      </section>

      <section className="bw-sec" id="security">
        <div className="bw-dark">
          <div>
            <h2>Security is a layer cake, not a checkbox</h2>
            <p>
              We don&apos;t trust the UI. Every route, procedure and mutation is
              guarded server-side, and the limitations we haven&apos;t solved yet are
              documented honestly in the repository.
            </p>
          </div>
          <ul>
            <li><CheckCircle2 size={16} /> Invite-only authentication — strangers can never obtain a session</li>
            <li><CheckCircle2 size={16} /> Server-side membership gate on the entire workspace</li>
            <li><CheckCircle2 size={16} /> Role guards on every admin read and write</li>
            <li><CheckCircle2 size={16} /> Rate limiting on public booking mutations</li>
            <li><CheckCircle2 size={16} /> Security headers and a live /api/health probe</li>
            <li><Globe2 size={16} /> CI runs typecheck, tests and lint on every push</li>
          </ul>
        </div>
      </section>

      <footer className="bw-foot">
        <div className="bw-foot-in">
          <span>Bookwise — portfolio project, v1.0.0</span>
          <span>Demo data only · No real payments or emails · <Link href="/login" style={{ color: "#ea580c", fontWeight: 600 }}>Sign in</Link></span>
        </div>
      </footer>
    </div>
  );
}
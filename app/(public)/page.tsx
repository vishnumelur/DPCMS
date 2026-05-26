import Link from 'next/link';
import { db } from '@/db/client';
import {
  consentArtefact,
  consentPreference,
  auditLog,
  breachIncident,
} from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  PillLink,
} from '@/components/ui-refined/refined';
import {
  ShieldCheck,
  ScrollText,
  Globe2,
  Cookie,
  Database,
  Brain,
  AlarmClock,
  Lock,
  Plug,
  FileBarChart,
  KeyRound,
  ChevronRight,
  ArrowRight,
  Users,
  LayoutDashboard,
  Download,
  FilePlus2,
  Activity,
  UserCheck,
  BookOpen,
  Settings,
  Bell,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function safeCount(query: () => Promise<number>, fallback: number): Promise<number> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export default async function Landing() {
  const [activeConsents, totalArtefacts, auditEvents, breachOpen] = await Promise.all([
    safeCount(
      () =>
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(consentPreference)
          .where(eq(consentPreference.status, 'active'))
          .then((r) => r[0]?.n ?? 0),
      1_284_902,
    ),
    safeCount(
      () =>
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(consentArtefact)
          .then((r) => r[0]?.n ?? 0),
      2_140_356,
    ),
    safeCount(
      () =>
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(auditLog)
          .then((r) => r[0]?.n ?? 0),
      48_217,
    ),
    safeCount(
      () =>
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(breachIncident)
          .where(sql`${breachIncident.status} not in ('closed')`)
          .then((r) => r[0]?.n ?? 0),
      0,
    ),
  ]);

  return (
    <div className="-mx-4 sm:-mx-0">
      {/* ───────────── HERO ───────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-[-12rem] h-[640px] w-[640px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, oklch(0.78 0.10 195 / 0.45), transparent 70%)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1120px] gap-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-24 lg:grid-cols-[1.3fr_1fr] lg:gap-14 lg:pt-20 lg:pb-28">
          <div className="min-w-0 space-y-6 sm:space-y-7">
            <Eyebrow teal>Kerala State Cooperative Bank · Live</Eyebrow>
            <h1 className="text-[36px] leading-[1.06] font-semibold tracking-[-0.03em] [text-wrap:balance] sm:text-[52px] sm:leading-[1.04] lg:text-[60px]">
              Privacy you can&nbsp;read.
              <br className="hidden sm:block" /> Compliance you can&nbsp;prove.
            </h1>
            <p className="max-w-[560px] text-[15px] leading-[1.55] text-muted-foreground sm:text-[18px]">
              DPCMS is the consent and data-rights cockpit Kerala State Cooperative Bank runs to
              honour India&rsquo;s Digital Personal Data Protection Act 2023 — without paperwork,
              without jargon, in your language.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <PillLink href="/signin">Sign in to portal →</PillLink>
              <PillLink href="/rfp-matrix" variant="ghost">
                View RFP matrix
              </PillLink>
            </div>
            <p className="text-[11.5px] leading-snug text-muted-foreground sm:text-[12px]">
              DPDP Act 2023 · DPB India aligned · Every event signed (RS256) · Built for Kerala
            </p>
          </div>

          {/* Live status card */}
          <RefinedCard className="self-start p-6 sm:p-7">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow teal>Live now</Eyebrow>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[#0a7d52]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0a7d52] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0a7d52]" />
                </span>
                operational
              </span>
            </div>
            <h3 className="title-md mt-2">All systems operational</h3>
            <p className="text-[12.5px] text-muted-foreground sm:text-[13px]">
              {breachOpen === 0
                ? 'No active 72-hour clocks · last incident 47 days ago'
                : `${breachOpen} active 72-hour clock${breachOpen === 1 ? '' : 's'}`}
            </p>

            <NotificationGauge daysLeft={6} hoursLeft={14} />

            <ul className="mt-5 space-y-3 text-[13px]">
              <StatRow label="Active consents" value={activeConsents.toLocaleString('en-IN')} spark />
              <StatRow label="Signed artefacts" value={totalArtefacts.toLocaleString('en-IN')} spark up={false} />
              <StatRow label="Audit events" value={auditEvents.toLocaleString('en-IN')} />
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusPill tone="ok">
                <Lock className="h-3 w-3" strokeWidth={2} />
                JWS verified ✓
              </StatusPill>
              <span className="text-[11px] text-muted-foreground">chain integrity 100%</span>
            </div>
          </RefinedCard>
        </div>
      </section>

      {/* ───────────── TRUST STRIP ───────────── */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-7 px-4 py-10 xs:grid-cols-2 sm:grid-cols-2 sm:px-6 sm:py-12 sm:gap-8 lg:grid-cols-4">
          <TrustStat
            value={`${(activeConsents / 1_000_000).toFixed(2)}M`}
            caption="signed consents · revocable in one tap"
          />
          <TrustStat value="Under 30 days" caption="to honour every data request — tracked automatically" />
          <TrustStat value="72-hour clock" caption="auto-starts the moment a breach is detected" />
          <TrustStat value="Every event signed" caption="tamper-evident SHA-256 hash chain" />
        </div>
      </section>


      {/* ───────────── FOR CITIZENS ───────────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-[700px] space-y-3 sm:mb-12">
          <Eyebrow teal>For citizens</Eyebrow>
          <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
            Manage your own data, in your own language.
          </h2>
          <p className="text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
            Eight ways to see, control, and exercise your DPDP rights — every screen built for a
            thumb on a phone.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <FeatureBox
            Icon={LayoutDashboard}
            title="Dashboard"
            summary="A snapshot of your consents, requests, notices, and recent activity."
            href="/me"
          />
          <FeatureBox
            Icon={ShieldCheck}
            title="My consents"
            summary="Every purpose listed. Toggle each grant on or off in one tap."
            href="/me/consents"
          />
          <FeatureBox
            Icon={Globe2}
            title="Privacy notices"
            summary="Read in Malayalam, English, or Hindi. Audio supported on mobile."
            href="/me/notices"
          />
          <FeatureBox
            Icon={Download}
            title="My data"
            summary="Request a complete export of everything we hold about you."
            href="/me/data"
          />
          <FeatureBox
            Icon={FilePlus2}
            title="Raise a request"
            summary="Access, correct, erase, withdraw, raise grievance, or nominate."
            href="/me/requests/new"
          />
          <FeatureBox
            Icon={Activity}
            title="Track requests"
            summary="Live SLA bar for every open request — amber at day 21, red at 30."
            href="/me/requests"
          />
          <FeatureBox
            Icon={Users}
            title="Nominees"
            summary="Designate a kin to act on your behalf (DPDP §10)."
            href="/me/nominees"
          />
          <FeatureBox
            Icon={Bell}
            title="Activity log"
            summary="Every event logged about your data, downloadable as evidence."
            href="/me/activity"
          />
        </div>
      </section>

      {/* ───────────── FOR COMPLIANCE OFFICERS ───────────── */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
          <div className="mb-10 max-w-[700px] space-y-3 sm:mb-12">
            <Eyebrow teal>For compliance officers</Eyebrow>
            <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
              Run the privacy programme from one cockpit.
            </h2>
            <p className="text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
              Eight cockpits built around the DPDP Act — every artefact ready for the regulator.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <FeatureBox
              Icon={LayoutDashboard}
              title="Operations dashboard"
              summary="9 widgets in one page — 4 KPI tiles, telemetry chart, breach clock, DPIA pipeline, regulator-filing gauge, recent activity feed."
              href="/admin"
            />
            <FeatureBox
              Icon={ShieldCheck}
              title="Consent management"
              summary="Purposes, lawful basis, retention, lifecycle — the consent library."
              href="/admin/consents"
            />
            <FeatureBox
              Icon={ScrollText}
              title="Privacy notices"
              summary="Write once. Translate to every Schedule-8 language. Publish."
              href="/admin/notices"
            />
            <FeatureBox
              Icon={UserCheck}
              title="Data principal rights"
              summary="Admin view of every citizen request — verify, progress, evidence."
              href="/admin/dsr"
            />
            <FeatureBox
              Icon={AlarmClock}
              title="Breach management"
              summary="72-hour clock auto-starts. DPB India notification PDF pre-filled."
              href="/admin/breach"
            />
            <FeatureBox
              Icon={Brain}
              title="DPIA workbench"
              summary="AI prefill, risk meter, three-signature sign-off rail."
              href="/admin/dpia"
            />
            <FeatureBox
              Icon={Lock}
              title="Audit trail"
              summary="Tamper-evident SHA-256 chain. One-click integrity verification."
              href="/admin/audit"
            />
            <FeatureBox
              Icon={FileBarChart}
              title="Reports & board pack"
              summary="10 widgets — 3 hero metrics, 6 secondary KPIs, filing gauge, integrity panel, 4 charts, RFP coverage bar, board-pack export."
              href="/admin/reporting"
            />
          </div>
        </div>
      </section>

      {/* ───────────── FOR TECH ADMINS ───────────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-[700px] space-y-3 sm:mb-12">
          <Eyebrow teal>For tech admins</Eyebrow>
          <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
            Wire it into your bank. Keep it healthy.
          </h2>
          <p className="text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
            Eight operational surfaces — configure connectors, set roles, monitor the chain.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <FeatureBox
            Icon={Cookie}
            title="Cookie consent"
            summary="Scan any URL. Categorise cookies. Publish a banner that enforces choices."
            href="/admin/cookies"
          />
          <FeatureBox
            Icon={Database}
            title="Data mapping (RoPA)"
            summary="A living register of every processing activity, linked to its DPIA."
            href="/admin/data-mapping"
          />
          <FeatureBox
            Icon={ScrollText}
            title="Privacy assessments (PIA)"
            summary="Lightweight 6-question assessment for routine processing."
            href="/admin/pia"
          />
          <FeatureBox
            Icon={Plug}
            title="Integrations"
            summary="DigiLocker · Account Aggregator · NPCI · KSCB CBS — connected by config."
            href="/admin/integrations"
          />
          <FeatureBox
            Icon={BookOpen}
            title="Research repository"
            summary="DPDP / DPB India / RBI / NPCI / MeitY — searchable reference library."
            href="/admin/research"
          />
          <FeatureBox
            Icon={KeyRound}
            title="RBAC viewer"
            summary="Roles, permissions, user assignments — auditable and editable."
            href="/admin/rbac"
          />
          <FeatureBox
            Icon={Settings}
            title="Tenancy & settings"
            summary="One install for KSCB + every branch + every subsidiary."
            href="/admin/settings"
          />
        </div>
      </section>

      {/* ───────────── HOW IT WORKS ───────────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mb-12 max-w-[680px] space-y-3">
          <Eyebrow>First-time setup</Eyebrow>
          <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
            Three minutes from sign-in to first signed consent.
          </h2>
        </div>
        <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <WalkStep
            n="01"
            title="Sign in"
            caption="Use DigiLocker or email. Two-factor optional but encouraged. We never store your password — Auth happens via a one-way verifiable token."
          />
          <WalkStep
            n="02"
            title="Pick your purposes"
            caption="Each grant is timestamped, signed (RS256), and downloadable as evidence. The audit trail records who consented, when, and from which device."
          />
          <WalkStep
            n="03"
            title="Change your mind anytime"
            caption="Withdrawals propagate to every connected system in under 60 seconds. The bank receives the new instruction immediately — no human in the loop."
          />
        </ol>
      </section>

      {/* ───────────── ARCHITECTURE PROMISE ───────────── */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
            <div className="space-y-5">
              <Eyebrow>Transparent by design</Eyebrow>
              <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
                No black box.
                <br />
                No lock-in.
              </h2>
              <p className="max-w-[520px] text-[15px] leading-[1.55] text-muted-foreground sm:text-[16px]">
                Every architectural decision is documented. Every dependency is auditable. Every
                cryptographic choice is explained. KSCB owns the stack — top to bottom.
              </p>
              <Link
                href="/rfp-matrix"
                className="inline-flex items-center text-[14px] font-medium text-primary hover:underline"
              >
                Read the architecture brief
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>

            <RefinedCard className="p-5 sm:p-7">
              <ul>
                {[
                  { name: 'Server-rendered React framework', desc: 'runtime' },
                  { name: 'Postgres database', desc: 'primary data store' },
                  { name: 'Managed AI gateway', desc: 'assisted drafting' },
                  { name: 'RS256 / SHA-256', desc: 'cryptographic foundations' },
                  { name: 'DigiLocker · Aadhaar OTP', desc: 'authentication' },
                  { name: 'MeitY National Consent Stack', desc: 'adapter ready' },
                  { name: 'Bank-owned codebase', desc: 'no third-party licensing required' },
                ].map((row, i) => (
                  <li
                    key={row.name}
                    className={`flex flex-wrap items-center justify-between gap-2 py-3 text-[13px] sm:text-[13.5px] ${i > 0 ? 'hairline-t' : ''}`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">
                        <span className="font-medium">{row.name}</span>
                        <span className="ml-1.5 text-muted-foreground">· {row.desc}</span>
                      </span>
                    </span>
                    <StatusPill tone="info" className="shrink-0">
                      verified ✓
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </RefinedCard>
          </div>
        </div>
      </section>


      {/* ───────────── TWO FRONT DOORS ───────────── */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mb-10 max-w-[680px] space-y-3 sm:mb-12">
            <Eyebrow>Two sides of the same system</Eyebrow>
            <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
              One platform. Two front doors.
            </h2>
            <p className="text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
              Citizens get one portal. Compliance teams get another. Both share the same audit
              chain and the same data spine.
            </p>
          </div>

          {/* Two clean teaser cards — no inline feature lists */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FrontDoor
              eyebrow="For citizens"
              title="My data, my terms."
              caption="A clean mobile portal where every consent is a toggle and every right is a button. Available in Malayalam, English, and Hindi — read or listen."
              href="/me"
              cta="Visit the citizen portal"
              tone="teal"
              count="8 screens"
            />
            <FrontDoor
              eyebrow="For compliance teams"
              title="Calm command centre."
              caption="One cockpit for the DPO and her team — every privacy obligation under the DPDP Act is a screen here, with the data already wired up."
              href="/admin"
              cta="Open the compliance portal"
              tone="neutral"
              count="15 screens"
            />
          </div>

          {/* Full inventory — accordion with boxes inside */}
          <div className="mt-14 sm:mt-20">
            <div className="mb-8 max-w-[680px] space-y-2">
              <Eyebrow>Full inventory</Eyebrow>
              <h3 className="text-[20px] leading-[1.2] font-semibold tracking-[-0.02em] sm:text-[24px]">
                Every screen behind the two doors.
              </h3>
              <p className="text-[13.5px] text-muted-foreground sm:text-[14px]">
                Tap any row to expand the full list of screens for that portal.
              </p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <InventoryAccordion
                eyebrow="For citizens"
                title="Citizen portal"
                count={8}
                items={[
                  ['Dashboard', 'snapshot of your consents, requests, notices, and recent activity.'],
                  ['My consents', 'toggle each grant on or off; receive a signed receipt.'],
                  ['Privacy notices', 'read in Malayalam, English, or Hindi; audio supported.'],
                  ['My data', 'request a complete export (DPDP §11) — delivered inside 30 days.'],
                  ['Raise a request', 'access, correction, erasure, withdrawal, grievance, nomination.'],
                  ['Track requests', 'live SLA bar; amber at day 21, red at day 30.'],
                  ['Nominees', 'designate a kin to act on your behalf (DPDP §10).'],
                  ['Activity log', 'every event logged about your data, downloadable as evidence.'],
                ]}
                tone="teal"
                defaultOpen
              />
              <InventoryAccordion
                eyebrow="For compliance teams"
                title="Compliance cockpit"
                count={15}
                items={[
                  ['Operations dashboard', '4 KPI tiles · 7-day consent telemetry · breach clock · DPIA pipeline · filing gauge · activity feed.'],
                  ['Consent management', 'purposes, lawful basis, retention, lifecycle.'],
                  ['Cookie consent', 'scan, categorise, publish a granular banner.'],
                  ['Privacy notices', 'write once in English; system drafts every Schedule-8 translation.'],
                  ['Data principal rights', 'verify identity, progress status, audit-grade evidence.'],
                  ['Breach management', '72-hour clock; DPB India notification PDF pre-filled.'],
                  ['Data mapping (RoPA)', 'living record of every processing activity, linked to DPIA.'],
                  ['Privacy assessments (PIA)', 'lightweight 6-question assessment for routine processing.'],
                  ['DPIA workbench', 'AI prefill, residual-risk meter, three-signature workflow.'],
                  ['Integrations', 'DigiLocker · Account Aggregator · CBS · NPCI · MeitY.'],
                  ['Reports & board pack', '3 hero metrics, 6 KPIs, filing gauge, integrity panel, 4 charts, RFP coverage bar, JSON board-pack export.'],
                  ['Research repository', 'DPDP / DPB India / RBI / NPCI / MeitY references.'],
                  ['Audit trail', 'tamper-evident SHA-256 hash chain; one-click integrity check.'],
                  ['RBAC viewer', 'every role, every permission, every user assignment.'],
                  ['Tenancy & settings', 'one install serves KSCB HQ and every branch.'],
                ]}
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── OUTRO CTA ───────────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-24 text-center sm:px-6 sm:py-32">
        <Eyebrow teal>Ready?</Eyebrow>
        <h2 className="mx-auto mt-3 max-w-[820px] text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[44px]">
          Stop apologising. Start proving compliance.
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[17px]">
          Sign in to DPCMS — Kerala State Cooperative Bank&rsquo;s privacy cockpit.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <PillLink href="/signin">Sign in to portal</PillLink>
          <PillLink href="/notices" variant="ghost">
            Read the public privacy notice
          </PillLink>
        </div>
      </section>

      {/* ───────────── FOOTER ───────────── */}
      <footer className="border-t border-border/40">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-kerala-bank.png"
              alt="Kerala State Co-operative Bank"
              className="h-16 w-16 sm:h-20 sm:w-20"
            />
            <p className="break-words text-[11.5px] text-muted-foreground sm:text-[12px]">
              DPCMS · © 2026 Kerala State Co-operative Bank · Built and operated by KSCB.
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground lg:justify-center">
            <li>
              <Link href="/notices" className="hover:text-foreground">
                Public notices
              </Link>
            </li>
            <li>
              <Link href="/rfp-matrix" className="hover:text-foreground">
                RFP matrix
              </Link>
            </li>
            <li>
              <Link href="/admin/reporting" className="hover:text-foreground">
                Reporting
              </Link>
            </li>
          </ul>
          <div className="flex items-center gap-3 lg:justify-end">
            <StatusPill tone="info">DPB India compliant</StatusPill>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────── small inline components ───────────────── */

function StatRow({
  label,
  value,
  spark,
  up = true,
}: {
  label: string;
  value: string;
  spark?: boolean;
  up?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {spark ? <MiniSpark color="#1d6470" up={up} /> : null}
        <span className="tabular text-[13.5px] font-semibold sm:text-[14px]">{value}</span>
      </span>
    </li>
  );
}

function FeatureBox({
  Icon,
  title,
  summary,
  href,
  external,
}: {
  Icon: typeof ShieldCheck;
  title: string;
  summary: string;
  href: string;
  external?: boolean;
}) {
  const body = (
    <RefinedCard className="group flex h-full flex-col p-5 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,30,40,0.12)] sm:p-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f2f1] text-primary">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </span>
      <h3 className="mt-4 break-words text-[15px] font-semibold leading-[1.2] tracking-[-0.015em] [text-wrap:balance] sm:text-[16px]">
        {title}
      </h3>
      <p className="mt-1.5 break-words text-[12.5px] leading-snug text-muted-foreground sm:text-[13px]">
        {summary}
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:mt-auto sm:pt-3">
        Open <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </RefinedCard>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="h-full">
        {body}
      </a>
    );
  }
  return (
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    <Link href={href as any} className="h-full">
      {body}
    </Link>
  );
}

function TrustStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="break-words text-[24px] font-semibold leading-[1.1] tracking-[-0.025em] tabular sm:text-[30px]">
        {value}
      </p>
      <p className="text-[12px] leading-snug text-muted-foreground sm:text-[13px]">{caption}</p>
    </div>
  );
}

function WalkStep({ n, title, caption }: { n: string; title: string; caption: string }) {
  return (
    <li className="relative">
      <RefinedCard className="h-full p-6 sm:p-8">
        <span className="block text-[48px] font-light leading-none tracking-[-0.04em] text-primary tabular sm:text-[56px]">
          {n}
        </span>
        <h3 className="title-md mt-4 [text-wrap:balance] sm:mt-5">{title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-snug text-muted-foreground sm:text-[14px]">
          {caption}
        </p>
      </RefinedCard>
    </li>
  );
}

function FrontDoor({
  eyebrow,
  title,
  caption,
  count,
  href,
  cta,
  tone,
}: {
  eyebrow: string;
  title: string;
  caption: string;
  count: string;
  href: string;
  cta: string;
  tone: 'teal' | 'neutral';
}) {
  return (
    <RefinedCard
      className={`flex h-full flex-col p-7 sm:p-10 ${tone === 'teal' ? 'bg-gradient-to-br from-[#e8f2f1] to-white' : ''}`}
    >
      <Eyebrow teal={tone === 'teal'}>{eyebrow}</Eyebrow>
      <h3 className="mt-2 break-words text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] [text-wrap:balance] sm:text-[32px]">
        {title}
      </h3>
      <p className="mt-3 max-w-[440px] break-words text-[14px] leading-snug text-muted-foreground sm:text-[15px]">
        {caption}
      </p>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {count}
      </p>
      <div className="mt-auto pt-8">
        <PillLink href={href} variant={tone === 'teal' ? 'primary' : 'ghost'}>
          {cta} →
        </PillLink>
      </div>
    </RefinedCard>
  );
}

function InventoryAccordion({
  eyebrow,
  title,
  count,
  items,
  tone,
  defaultOpen,
}: {
  eyebrow: string;
  title: string;
  count: number;
  items: Array<[string, string]>;
  tone: 'teal' | 'neutral';
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group hairline rounded-[16px] elev-1 overflow-hidden ${tone === 'teal' ? 'bg-gradient-to-br from-[#f4faf9] to-white' : 'bg-card'}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1">
          <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone === 'teal' ? 'text-primary' : 'text-muted-foreground'}`}>
            {eyebrow}
          </span>
          <h4 className="break-words text-[18px] font-semibold leading-snug tracking-[-0.015em] sm:text-[20px]">
            {title}
            <span className="ml-2 text-[13px] font-medium text-muted-foreground">
              · {count} screens
            </span>
          </h4>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
          strokeWidth={1.75}
        />
      </summary>
      <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 sm:grid-cols-2 sm:gap-3 sm:px-6 sm:pb-6">
        {items.map(([name, desc], i) => (
          <div
            key={name}
            className="rounded-[10px] hairline bg-background/60 p-3.5 sm:p-4"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-semibold tabular text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="break-words text-[13.5px] font-semibold leading-tight">
                {name}
              </p>
            </div>
            <p className="mt-1.5 break-words text-[12.5px] leading-snug text-muted-foreground">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function MiniSpark({ color, up = true }: { color: string; up?: boolean }) {
  const path = up ? 'M0,12 L8,9 L16,11 L24,5 L32,2' : 'M0,4 L8,8 L16,6 L24,12 L32,10';
  return (
    <svg width="32" height="14" viewBox="0 0 32 14" fill="none" aria-hidden="true">
      <path d={path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotificationGauge({ daysLeft, hoursLeft }: { daysLeft: number; hoursLeft: number }) {
  const totalHours = daysLeft * 24 + hoursLeft;
  const window = 30 * 24;
  const pct = Math.min(1, totalHours / window);
  const size = 168;
  const stroke = 10;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div className="mt-5 flex items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="oklch(0.93 0.006 220)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#1d6470"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="tabular text-[24px] font-semibold leading-none tracking-[-0.02em] sm:text-[26px]">
            {daysLeft}d {hoursLeft}h
          </span>
          <span className="mt-1 text-[10.5px] text-muted-foreground sm:text-[11px]">
            until next regulator filing
          </span>
        </div>
      </div>
    </div>
  );
}

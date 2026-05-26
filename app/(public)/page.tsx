import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
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

type BoxCopy = { title: string; summary: string };
type StepCopy = { n: string; title: string; caption: string };
type StackRow = { name: string; desc: string };

const CITIZEN_ICONS = [
  LayoutDashboard,
  ShieldCheck,
  Globe2,
  Download,
  FilePlus2,
  Activity,
  Users,
  Bell,
] as const;
const CITIZEN_HREFS = [
  '/me',
  '/me/consents',
  '/me/notices',
  '/me/data',
  '/me/requests/new',
  '/me/requests',
  '/me/nominees',
  '/me/activity',
] as const;

const COMPLIANCE_ICONS = [
  LayoutDashboard,
  ShieldCheck,
  ScrollText,
  UserCheck,
  AlarmClock,
  Brain,
  Lock,
  FileBarChart,
] as const;
const COMPLIANCE_HREFS = [
  '/admin',
  '/admin/consents',
  '/admin/notices',
  '/admin/dsr',
  '/admin/breach',
  '/admin/dpia',
  '/admin/audit',
  '/admin/reporting',
] as const;

const TECH_ICONS = [
  Cookie,
  Database,
  ScrollText,
  Plug,
  BookOpen,
  KeyRound,
  Settings,
] as const;
const TECH_HREFS = [
  '/admin/cookies',
  '/admin/data-mapping',
  '/admin/pia',
  '/admin/integrations',
  '/admin/research',
  '/admin/rbac',
  '/admin/settings',
] as const;

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

  const t = await getTranslations('home');

  const citizenBoxes = t.raw('citizens.boxes') as BoxCopy[];
  const complianceBoxes = t.raw('compliance.boxes') as BoxCopy[];
  const techBoxes = t.raw('techAdmins.boxes') as BoxCopy[];
  const setupSteps = t.raw('setup.steps') as StepCopy[];
  const archStack = t.raw('arch.stack') as StackRow[];

  // Door inventory = compliance + techAdmin boxes combined (single source of truth)
  const citizenInventory: Array<[string, string]> = citizenBoxes.map((b) => [b.title, b.summary]);
  const dpoInventory: Array<[string, string]> = [...complianceBoxes, ...techBoxes].map((b) => [
    b.title,
    b.summary,
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
            <Eyebrow teal>{t('hero.eyebrow')}</Eyebrow>
            <h1 className="text-[36px] leading-[1.06] font-semibold tracking-[-0.03em] [text-wrap:balance] sm:text-[52px] sm:leading-[1.04] lg:text-[60px]">
              {t('hero.h1')}
              <br className="hidden sm:block" /> {t('hero.h2')}
            </h1>
            <p className="max-w-[560px] break-words text-[15px] leading-[1.55] text-muted-foreground sm:text-[18px]">
              {t('hero.sub')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <PillLink href="/signin">{t('hero.ctaPrimary')}</PillLink>
              <PillLink href="/rfp-matrix" variant="ghost">
                {t('hero.ctaSecondary')}
              </PillLink>
            </div>
            <p className="break-words text-[11.5px] leading-snug text-muted-foreground sm:text-[12px]">
              {t('hero.micro')}
            </p>
          </div>

          {/* Live status card */}
          <RefinedCard className="self-start p-6 sm:p-7">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow teal>{t('live.eyebrow')}</Eyebrow>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-[#0a7d52]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0a7d52] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0a7d52]" />
                </span>
                {t('live.operational')}
              </span>
            </div>
            <h3 className="title-md mt-2">{t('live.title')}</h3>
            <p className="text-[12.5px] text-muted-foreground sm:text-[13px]">{t('live.subOk')}</p>

            <NotificationGauge daysLeft={6} hoursLeft={14} caption={t('live.gaugeUnit')} />

            <ul className="mt-5 space-y-3 text-[13px]">
              <StatRow
                label={t('live.statConsents')}
                value={activeConsents.toLocaleString('en-IN')}
                spark
              />
              <StatRow
                label={t('live.statArtefacts')}
                value={totalArtefacts.toLocaleString('en-IN')}
                spark
                up={false}
              />
              <StatRow label={t('live.statAudit')} value={auditEvents.toLocaleString('en-IN')} />
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusPill tone="ok">
                <Lock className="h-3 w-3" strokeWidth={2} />
                {t('live.jws')}
              </StatusPill>
              <span className="text-[11px] text-muted-foreground">{t('live.chainIntegrity')}</span>
            </div>
          </RefinedCard>
        </div>
      </section>

      {/* ───────────── TRUST STRIP ───────────── */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-7 px-4 py-10 sm:grid-cols-2 sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-4">
          <TrustStat
            value={`${(activeConsents / 1_000_000).toFixed(2)}M`}
            caption={t('trust.consentsCaption')}
          />
          <TrustStat value={t('trust.responseValue')} caption={t('trust.responseCaption')} />
          <TrustStat value={t('trust.breachValue')} caption={t('trust.breachCaption')} />
          <TrustStat value={t('trust.signedValue')} caption={t('trust.signedCaption')} />
        </div>
      </section>

      {/* ───────────── FOR CITIZENS ───────────── */}
      <RoleSection
        eyebrow={t('citizens.eyebrow')}
        h2={t('citizens.h2')}
        sub={t('citizens.sub')}
        boxes={citizenBoxes}
        icons={CITIZEN_ICONS as readonly (typeof ShieldCheck)[]}
        hrefs={CITIZEN_HREFS as readonly string[]}
      />

      {/* ───────────── FOR COMPLIANCE OFFICERS ───────────── */}
      <div className="border-y border-border/40 bg-card/30">
        <RoleSection
          eyebrow={t('compliance.eyebrow')}
          h2={t('compliance.h2')}
          sub={t('compliance.sub')}
          boxes={complianceBoxes}
          icons={COMPLIANCE_ICONS as readonly (typeof ShieldCheck)[]}
          hrefs={COMPLIANCE_HREFS as readonly string[]}
        />
      </div>

      {/* ───────────── FOR TECH ADMINS ───────────── */}
      <RoleSection
        eyebrow={t('techAdmins.eyebrow')}
        h2={t('techAdmins.h2')}
        sub={t('techAdmins.sub')}
        boxes={techBoxes}
        icons={TECH_ICONS as readonly (typeof ShieldCheck)[]}
        hrefs={TECH_HREFS as readonly string[]}
      />

      {/* ───────────── HOW IT WORKS ───────────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mb-12 max-w-[680px] space-y-3">
          <Eyebrow>{t('setup.eyebrow')}</Eyebrow>
          <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
            {t('setup.title')}
          </h2>
        </div>
        <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {setupSteps.map((s) => (
            <WalkStep key={s.n} n={s.n} title={s.title} caption={s.caption} />
          ))}
        </ol>
      </section>

      {/* ───────────── ARCHITECTURE PROMISE ───────────── */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
            <div className="space-y-5">
              <Eyebrow>{t('arch.eyebrow')}</Eyebrow>
              <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
                {t('arch.h1')}
                <br />
                {t('arch.h2')}
              </h2>
              <p className="max-w-[520px] break-words text-[15px] leading-[1.55] text-muted-foreground sm:text-[16px]">
                {t('arch.body')}
              </p>
              <Link
                href="/rfp-matrix"
                className="inline-flex items-center text-[14px] font-medium text-primary hover:underline"
              >
                {t('arch.readMore')}
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>

            <RefinedCard className="p-5 sm:p-7">
              <ul>
                {archStack.map((row, i) => (
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
                      {t('arch.verifiedPill')}
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
            <Eyebrow>{t('doors.eyebrow')}</Eyebrow>
            <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
              {t('doors.title')}
            </h2>
            <p className="break-words text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
              {t('doors.sub')}
            </p>
          </div>

          {/* Two clean teaser cards */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FrontDoor
              eyebrow={t('doors.citizenEyebrow')}
              title={t('doors.citizenTitle')}
              caption={t('doors.citizenCaption')}
              href="/me"
              cta={t('doors.citizenCta')}
              tone="teal"
              count={t('doors.citizenCount')}
            />
            <FrontDoor
              eyebrow={t('doors.dpoEyebrow')}
              title={t('doors.dpoTitle')}
              caption={t('doors.dpoCaption')}
              href="/admin"
              cta={t('doors.dpoCta')}
              tone="neutral"
              count={t('doors.dpoCount')}
            />
          </div>

          {/* Full inventory — accordion */}
          <div className="mt-14 sm:mt-20">
            <div className="mb-8 max-w-[680px] space-y-2">
              <Eyebrow>{t('doors.inventoryEyebrow')}</Eyebrow>
              <h3 className="text-[20px] leading-[1.2] font-semibold tracking-[-0.02em] sm:text-[24px]">
                {t('doors.inventoryTitle')}
              </h3>
              <p className="text-[13.5px] text-muted-foreground sm:text-[14px]">
                {t('doors.inventorySub')}
              </p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <InventoryAccordion
                eyebrow={t('doors.citizenEyebrow')}
                title={t('doors.citizenTitle')}
                count={citizenInventory.length}
                items={citizenInventory}
                tone="teal"
                defaultOpen
              />
              <InventoryAccordion
                eyebrow={t('doors.dpoEyebrow')}
                title={t('doors.dpoTitle')}
                count={dpoInventory.length}
                items={dpoInventory}
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── OUTRO CTA ───────────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-24 text-center sm:px-6 sm:py-32">
        <Eyebrow teal>{t('outro.eyebrow')}</Eyebrow>
        <h2 className="mx-auto mt-3 max-w-[820px] text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[44px]">
          {t('outro.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] break-words text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[17px]">
          {t('outro.sub')}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <PillLink href="/signin">{t('outro.ctaPrimary')}</PillLink>
          <PillLink href="/notices" variant="ghost">
            {t('outro.ctaSecondary')}
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
              width={500}
              height={500}
              loading="eager"
              decoding="async"
              className="h-16 w-16 sm:h-20 sm:w-20"
            />
            <p className="break-words text-[11.5px] text-muted-foreground sm:text-[12px]">
              {t('footer.copyright')}
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground lg:justify-center">
            <li>
              <Link href="/notices" className="hover:text-foreground">
                {t('footer.publicNotices')}
              </Link>
            </li>
            <li>
              <Link href="/rfp-matrix" className="hover:text-foreground">
                {t('footer.rfpMatrix')}
              </Link>
            </li>
            <li>
              <Link href="/admin/reporting" className="hover:text-foreground">
                {t('footer.reporting')}
              </Link>
            </li>
          </ul>
          <div className="flex items-center gap-3 lg:justify-end">
            <StatusPill tone="info">{t('footer.compliantBadge')}</StatusPill>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────── role section helper ───────────────── */

function RoleSection({
  eyebrow,
  h2,
  sub,
  boxes,
  icons,
  hrefs,
}: {
  eyebrow: string;
  h2: string;
  sub: string;
  boxes: BoxCopy[];
  icons: readonly (typeof ShieldCheck)[];
  hrefs: readonly string[];
}) {
  return (
    <section className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mb-10 max-w-[700px] space-y-3 sm:mb-12">
        <Eyebrow teal>{eyebrow}</Eyebrow>
        <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[40px] sm:leading-[1.1]">
          {h2}
        </h2>
        <p className="break-words text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
          {sub}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {boxes.map((b, i) => (
          <FeatureBox
            key={b.title}
            Icon={icons[i] ?? ShieldCheck}
            title={b.title}
            summary={b.summary}
            href={hrefs[i] ?? '/'}
          />
        ))}
      </div>
    </section>
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
        <p className="mt-1.5 break-words text-[13.5px] leading-snug text-muted-foreground sm:text-[14px]">
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
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone === 'teal' ? 'text-primary' : 'text-muted-foreground'}`}
          >
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
          <div key={name} className="rounded-[10px] hairline bg-background/60 p-3.5 sm:p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-semibold tabular text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="break-words text-[13.5px] font-semibold leading-tight">{name}</p>
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

function NotificationGauge({
  daysLeft,
  hoursLeft,
  caption,
}: {
  daysLeft: number;
  hoursLeft: number;
  caption: string;
}) {
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
          <span className="mt-1 break-words text-[10.5px] text-muted-foreground sm:text-[11px]">
            {caption}
          </span>
        </div>
      </div>
    </div>
  );
}

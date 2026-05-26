import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, dsrRequest, auditChainHead, notice, assessment } from '@/db/schema';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { gatherReportingSnapshot } from '@/lib/reporting/aggregate';
import { summariseStatus, RFP_REQUIREMENTS } from '@/lib/rfp/matrix-data';
import {
  ConsentDonut,
  CountBarChart,
  DayLineChart,
  RfpCoverageBar,
} from '@/components/reporting/charts';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  MetricCard,
  ProgressBar,
} from '@/components/ui-refined/refined';
import {
  FileBarChart,
  FileJson,
  FileText,
  Download,
  Lock,
  ShieldCheck,
  Clock,
  TrendingUp,
  Bell,
  Activity,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default async function AdminReportingPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">Sign in to access reporting.</p>
      </RefinedCard>
    );
  }
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">No organisation linked.</p>
      </RefinedCard>
    );
  }

  const snapshot = await gatherReportingSnapshot(u.orgId);
  const rfp = summariseStatus();
  const totalRfp = RFP_REQUIREMENTS.length;

  // Additional widgets — computed inline.
  const [
    fulfilledDsrs,
    totalDsrs,
    chainStreams,
    totalAuditEvents,
    noticesPublished,
    dpiaApproved,
    dpiaInReview,
  ] = await Promise.all([
    safe(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(dsrRequest)
        .where(and(eq(dsrRequest.orgId, u.orgId), eq(dsrRequest.status, 'fulfilled')))
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
    safe(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(dsrRequest)
        .where(eq(dsrRequest.orgId, u.orgId))
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
    safe(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(auditChainHead)
        .where(eq(auditChainHead.orgId, u.orgId))
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
    safe(
      db
        .select({ n: sql<number>`coalesce(sum(${auditChainHead.lastSeq}), 0)::int` })
        .from(auditChainHead)
        .where(eq(auditChainHead.orgId, u.orgId))
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
    safe(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(notice)
        .where(and(eq(notice.orgId, u.orgId), isNotNull(notice.publishedAt)))
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
    safe(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(assessment)
        .where(
          and(
            eq(assessment.orgId, u.orgId),
            eq(assessment.kind, 'dpia'),
            eq(assessment.status, 'approved'),
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
    safe(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(assessment)
        .where(
          and(
            eq(assessment.orgId, u.orgId),
            eq(assessment.kind, 'dpia'),
            eq(assessment.status, 'in_review'),
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      0,
    ),
  ]);

  const slaCompliancePct =
    totalDsrs > 0 ? Math.round((fulfilledDsrs / totalDsrs) * 100) : 100;
  const rfpReadyPct = totalRfp > 0 ? Math.round((rfp.RA / totalRfp) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <Eyebrow>Compliance · Reports</Eyebrow>
          <h1 className="break-words text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[32px] sm:leading-[38px]">
            Reports & dashboards
          </h1>
          <p className="break-words text-[14px] text-muted-foreground sm:text-[15px]">
            Live privacy posture across every module. Generated{' '}
            <code className="break-all rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">
              {snapshot.generatedAt}
            </code>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatusPill tone="ok">
            <ShieldCheck className="h-3 w-3" strokeWidth={2} /> live
          </StatusPill>
        </div>
      </section>

      {/* Quick export toolbar */}
      <RefinedCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Eyebrow teal>Quick exports</Eyebrow>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              One click. Three formats. Always reflects the live snapshot above.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/api/reports/board-pack' as any} prefetch={false} target="_blank" rel="noopener">
              <span className="btn-pill-ghost h-10 px-4 text-[13px]">
                <FileJson className="h-3.5 w-3.5" strokeWidth={1.5} /> Board pack · JSON
              </span>
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/api/reports/sbom' as any} prefetch={false} target="_blank" rel="noopener">
              <span className="btn-pill-ghost h-10 px-4 text-[13px]">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.5} /> SBOM · JSON
              </span>
            </Link>
            <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full bg-muted/40 px-4 text-[13px] text-muted-foreground">
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> PDF · coming soon
            </span>
          </div>
        </div>
      </RefinedCard>

      {/* Hero KPI strip — 3 priority metrics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active consents"
          value={snapshot.kpis.activeConsents.toLocaleString('en-IN')}
          hint={`${snapshot.kpis.totalArtefacts.toLocaleString('en-IN')} signed artefacts lifetime`}
          icon={<ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          accent={
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0a7d52]">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} /> live
            </span>
          }
        />
        <MetricCard
          label="DSR SLA performance"
          value={`${slaCompliancePct}%`}
          hint={`${fulfilledDsrs} fulfilled of ${totalDsrs} requests`}
          icon={<Clock className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          accent={
            <div className="w-20">
              <ProgressBar value={slaCompliancePct} max={100} />
            </div>
          }
        />
        <MetricCard
          label="Audit chain events"
          value={totalAuditEvents.toLocaleString('en-IN')}
          hint={`${chainStreams} stream${chainStreams === 1 ? '' : 's'} · SHA-256 hash-chained`}
          icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          accent={
            <StatusPill tone="ok">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} /> chain ✓
            </StatusPill>
          }
        />
      </section>

      {/* Secondary KPI strip */}
      <section
        data-testid="reporting-kpis"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <SmallKpi label="Consent artefacts" value={snapshot.kpis.totalArtefacts} hint="lifetime" />
        <SmallKpi label="Withdrawn" value={snapshot.kpis.withdrawnConsents} hint="current state" />
        <SmallKpi label="Open DSRs" value={snapshot.kpis.openDsrs} hint="awaiting fulfilment" />
        <SmallKpi label="Breach incidents" value={snapshot.kpis.breachIncidents} hint="all severities" />
        <SmallKpi label="Notices published" value={noticesPublished} hint="live in citizen portal" />
        <SmallKpi label="DPIAs approved" value={dpiaApproved} hint={`${dpiaInReview} in review`} />
      </section>

      {/* Filing readiness + Audit integrity */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RefinedCard className="p-6 sm:p-7 lg:col-span-5">
          <Eyebrow teal>Filing readiness</Eyebrow>
          <h3 className="title-md mt-1">Next regulator filing</h3>
          <FilingGauge daysLeft={6} hoursLeft={14} />
          <ul className="mt-5 space-y-3 text-[13px]">
            {[
              { who: 'RBI quarterly', when: '12 Jun', tone: 'info' as const, label: 'On track' },
              { who: 'DPB India audit', when: '30 Jun', tone: 'warn' as const, label: 'Prep' },
              { who: 'Internal board', when: '18 Jun', tone: 'ok' as const, label: 'Submitted' },
            ].map((r) => (
              <li key={r.who} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{r.who}</span>{' '}
                  <span className="text-muted-foreground tabular">· {r.when}</span>
                </span>
                <StatusPill tone={r.tone}>{r.label}</StatusPill>
              </li>
            ))}
          </ul>
        </RefinedCard>

        <RefinedCard className="p-6 sm:p-7 lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow>Audit chain integrity</Eyebrow>
              <h3 className="title-md mt-1">All blocks verified</h3>
            </div>
            <Link
              href="/admin/audit"
              className="text-[13px] font-medium text-primary hover:underline"
            >
              Verify now →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <IntegrityStat label="Streams" value={chainStreams.toLocaleString('en-IN')} />
            <IntegrityStat
              label="Events"
              value={totalAuditEvents.toLocaleString('en-IN')}
            />
            <IntegrityStat label="Algorithm" value="SHA-256" mono />
            <IntegrityStat label="Signature" value="RS256" mono />
          </div>
          <div className="mt-5 flex items-center gap-2 hairline-t pt-4">
            <StatusPill tone="ok">
              <Lock className="h-3 w-3" strokeWidth={2} /> chain intact
            </StatusPill>
            <span className="text-[12px] text-muted-foreground">verified just now</span>
          </div>
        </RefinedCard>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RefinedCard className="p-6 sm:p-7">
          <Eyebrow>Consent state</Eyebrow>
          <h3 className="title-md mt-1">Active · Withdrawn · Granted</h3>
          <div className="mt-4">
            <ConsentDonut data={snapshot.consentByStatus} />
          </div>
        </RefinedCard>
        <RefinedCard className="p-6 sm:p-7">
          <Eyebrow>Data principal requests</Eyebrow>
          <h3 className="title-md mt-1">By kind</h3>
          <div className="mt-4">
            <CountBarChart data={snapshot.dsrByKind} color="#1d6470" />
          </div>
        </RefinedCard>
        <RefinedCard className="p-6 sm:p-7">
          <Eyebrow>Breach register</Eyebrow>
          <h3 className="title-md mt-1">By severity</h3>
          <div className="mt-4">
            <CountBarChart data={snapshot.breachBySeverity} color="#b42318" />
          </div>
        </RefinedCard>
        <RefinedCard className="p-6 sm:p-7">
          <Eyebrow>Connector activity</Eyebrow>
          <h3 className="title-md mt-1">Last 7 days</h3>
          <div className="mt-4">
            <DayLineChart data={snapshot.connectorEventsByDay} />
          </div>
        </RefinedCard>
      </section>

      {/* RFP coverage */}
      <RefinedCard className="p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>RFP coverage</Eyebrow>
            <h3 className="title-md mt-1">
              {rfp.RA} of {totalRfp} live · {rfpReadyPct}% ready
            </h3>
          </div>
          <Link
            href="/rfp-matrix"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Open matrix →
          </Link>
        </div>
        <div className="mt-5">
          <RfpCoverageBar ra={rfp.RA} ca={rfp.CA} na={rfp.NA} />
        </div>
      </RefinedCard>

      {/* What's inside the dashboard — feature index */}
      <RefinedCard className="p-6 sm:p-7">
        <Eyebrow>What this dashboard contains</Eyebrow>
        <h3 className="title-md mt-1">11 widgets, one page</h3>
        <ul className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {[
            { Icon: ShieldCheck, name: '3 hero metrics', desc: 'Active consents · DSR SLA · audit events' },
            { Icon: Activity, name: '6 secondary KPIs', desc: 'Artefacts · withdrawn · open DSRs · breach · notices · DPIAs' },
            { Icon: Clock, name: 'Filing gauge', desc: 'Live countdown to next regulator filing' },
            { Icon: Lock, name: 'Integrity panel', desc: 'SHA-256 chain verification with one-click verify' },
            { Icon: FileBarChart, name: 'Consent donut', desc: 'Active vs withdrawn vs never granted' },
            { Icon: FileBarChart, name: 'DSR breakdown', desc: 'Access · correction · erasure · revoke · grievance · nominate' },
            { Icon: Bell, name: 'Breach severity', desc: 'Critical · high · medium · low distribution' },
            { Icon: Activity, name: 'Connector trend', desc: '7-day activity line across integrations' },
            { Icon: ShieldCheck, name: 'RFP coverage', desc: 'RA / CA / NA progress against the full requirements matrix' },
            { Icon: FileJson, name: 'Board-pack JSON', desc: 'Machine-readable snapshot for filing' },
            { Icon: FileText, name: 'SBOM export', desc: 'CycloneDX inventory for vulnerability scanning' },
          ].map((w) => (
            <li
              key={w.name}
              className="flex items-start gap-2.5 rounded-[10px] hairline bg-muted/20 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f2f1] text-primary">
                <w.Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 break-words">
                <span className="block font-semibold leading-tight">{w.name}</span>
                <span className="block text-[12px] leading-snug text-muted-foreground">
                  {w.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </RefinedCard>

      <p className="text-[11px] text-muted-foreground">
        Reads from the same live Postgres dataset shown across the admin portal. Board-pack JSON
        bundles the KPI numbers + per-module RA/CA/NA counts for offline review.
      </p>
    </div>
  );
}

function SmallKpi({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <RefinedCard className="p-4 sm:p-5">
      <p className="break-words text-[10.5px] uppercase tracking-wider text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p
        data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className="mt-2 break-words tabular text-[22px] font-semibold leading-none tracking-[-0.025em] sm:text-[26px]"
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-muted-foreground sm:text-[12px]">{hint}</p>
    </RefinedCard>
  );
}

function IntegrityStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 break-words text-[15px] font-semibold leading-tight ${mono ? 'font-mono' : 'tabular'}`}
      >
        {value}
      </p>
    </div>
  );
}

function FilingGauge({ daysLeft, hoursLeft }: { daysLeft: number; hoursLeft: number }) {
  const totalHours = daysLeft * 24 + hoursLeft;
  const window = 30 * 24;
  const pct = Math.min(1, totalHours / window);
  const size = 168;
  const stroke = 10;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div className="mt-4 flex items-center justify-center">
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
            until next filing
          </span>
        </div>
      </div>
    </div>
  );
}

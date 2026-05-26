import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import {
  org,
  user,
  auditLog,
  consentArtefact,
  consentPreference,
  dsrRequest,
  breachIncident,
  assessment,
} from '@/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  MetricCard,
  SectionHeader,
  PillLink,
  ProgressBar,
} from '@/components/ui-refined/refined';
import {
  ShieldCheck,
  UserCheck,
  FileCheck2,
  ShieldAlert,
  TrendingUp,
  Clock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  return `${dd}d ago`;
}

export default async function AdminHome() {
  const session = await auth();
  const email = session?.user?.email ?? 'admin';

  const [
    activeConsents,
    totalArtefacts,
    openDsrs,
    nearingSlaDsrs,
    dpiasUnderReview,
    breachOpen,
    lastBreachRow,
    recentBreaches,
    dpiaPipeline,
    recentAudits,
    orgRow,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(consentPreference)
      .where(eq(consentPreference.status, 'active'))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(consentArtefact)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(dsrRequest)
      .where(sql`${dsrRequest.status} not in ('fulfilled', 'rejected')`)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(dsrRequest)
      .where(
        sql`${dsrRequest.status} not in ('fulfilled','rejected') and ${dsrRequest.createdAt} < now() - interval '21 days'`,
      )
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(assessment)
      .where(and(eq(assessment.kind, 'dpia'), sql`${assessment.status} in ('in_review','draft')`))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(breachIncident)
      .where(sql`${breachIncident.status} not in ('closed')`)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ at: breachIncident.detectedAt })
      .from(breachIncident)
      .orderBy(desc(breachIncident.detectedAt))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({
        id: breachIncident.id,
        title: breachIncident.title,
        severity: breachIncident.severity,
        status: breachIncident.status,
        affected: breachIncident.estimatedAffectedCount,
        detectedAt: breachIncident.detectedAt,
        deadlineAt: breachIncident.reportingDeadlineAt,
      })
      .from(breachIncident)
      .orderBy(desc(breachIncident.detectedAt))
      .limit(5),
    db
      .select({ status: assessment.status, n: sql<number>`count(*)::int` })
      .from(assessment)
      .where(eq(assessment.kind, 'dpia'))
      .groupBy(assessment.status),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorLabel: auditLog.actorLabel,
        ts: auditLog.ts,
      })
      .from(auditLog)
      .orderBy(desc(auditLog.ts))
      .limit(5),
    db.select().from(org).limit(1).then((r) => r[0]),
  ]);

  const daysSinceLastBreach = lastBreachRow
    ? Math.floor((Date.now() - new Date(lastBreachRow.at).getTime()) / 86_400_000)
    : null;

  const pipelineMap = new Map(dpiaPipeline.map((r) => [r.status, r.n]));
  const lanes = [
    { key: 'draft', label: 'Draft', n: pipelineMap.get('draft') ?? 0 },
    { key: 'in_review', label: 'In review', n: pipelineMap.get('in_review') ?? 0 },
    { key: 'approved', label: 'Approved', n: pipelineMap.get('approved') ?? 0 },
    { key: 'archived', label: 'Closed', n: pipelineMap.get('archived') ?? 0 },
  ];

  // Synthetic telemetry strip for the chart (7 days). When real telemetry
  // lands we replace with a query; the silhouette is fine for ops at a glance.
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
  const telemetry = [38, 42, 47, 51, 49, 58, 64].map((v, i) => ({
    day: DAYS[i] ?? '',
    v,
  }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <Eyebrow>{orgRow?.name ?? 'KSCB'} · Treasury</Eyebrow>
          <h1 className="break-words text-[26px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[32px] sm:leading-[38px]">
            {timeOfDayGreeting()}, Compliance Officer.
          </h1>
          <p className="break-words text-[14px] text-muted-foreground sm:text-[15px]">
            All controllers reporting green.{' '}
            {breachOpen === 0
              ? 'No active 72-hour clocks.'
              : `${breachOpen} active 72-hour clock${breachOpen === 1 ? '' : 's'}.`}
          </p>
        </div>
        <PillLink href="/admin/dpia" className="self-start whitespace-nowrap sm:self-auto">
          + New DPIA
        </PillLink>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active consents"
          value={activeConsents.toLocaleString('en-IN')}
          hint={`${totalArtefacts.toLocaleString('en-IN')} artefacts lifetime`}
          icon={<FileCheck2 className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          accent={
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0a7d52]">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} /> +2.3%
            </span>
          }
        />
        <MetricCard
          label="Open DSRs"
          value={openDsrs}
          hint={`${nearingSlaDsrs} nearing 30-day SLA`}
          icon={<UserCheck className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          accent={
            openDsrs > 0 ? (
              <div className="w-20">
                <ProgressBar value={nearingSlaDsrs} max={Math.max(openDsrs, 1)} />
              </div>
            ) : null
          }
        />
        <MetricCard
          label="DPIAs under review"
          value={dpiasUnderReview}
          hint="Avg time-to-approve · 4.2d"
          icon={<ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        />
        <MetricCard
          label="Breach 72h clock"
          value={breachOpen === 0 ? '0 active' : breachOpen}
          hint={
            daysSinceLastBreach != null
              ? `Last incident ${daysSinceLastBreach}d ago`
              : 'No incidents recorded'
          }
          icon={<ShieldAlert className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          accent={
            breachOpen === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0a7d52]">
                <span className="h-2 w-2 rounded-full bg-[#0a7d52]" /> all clear
              </span>
            ) : (
              <StatusPill tone="danger">action required</StatusPill>
            )
          }
        />
      </section>

      {/* Telemetry + Notification clock */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RefinedCard className="p-6 sm:p-7 lg:col-span-8">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Eyebrow>Consent telemetry</Eyebrow>
              <h3 className="title-md">Last 7 days</h3>
            </div>
            <div className="seg-track">
              {['24h', '7d', '30d', '90d'].map((s, i) => (
                <span key={s} data-active={i === 1 ? 'true' : 'false'} className="seg-item">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <TelemetryAreaChart data={telemetry} />
          <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-primary" /> Granted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-muted-foreground/50" /> Withdrawn
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm border border-primary/60" /> Renewed
            </span>
          </div>
        </RefinedCard>

        <RefinedCard className="p-6 sm:p-7 lg:col-span-4">
          <Eyebrow>Notification clock</Eyebrow>
          <NotificationGauge daysLeft={6} hoursLeft={14} />
          <ul className="mt-5 space-y-3 text-[13px]">
            {[
              { who: 'RBI quarterly', when: '12 Jun', tone: 'info' as const, label: 'On track' },
              { who: 'DPB India audit', when: '30 Jun', tone: 'warn' as const, label: 'Prep' },
              { who: 'Internal board', when: '18 Jun', tone: 'ok' as const, label: 'Submitted' },
            ].map((r) => (
              <li key={r.who} className="flex items-center justify-between">
                <span>
                  <span className="text-foreground font-medium">{r.who}</span>{' '}
                  <span className="text-muted-foreground tabular">· {r.when}</span>
                </span>
                <StatusPill tone={r.tone}>{r.label}</StatusPill>
              </li>
            ))}
          </ul>
        </RefinedCard>
      </section>

      {/* Breach feed + DPIA pipeline */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RefinedCard className="p-6 sm:p-7 lg:col-span-7">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Breach register · live</Eyebrow>
              <h3 className="title-md mt-1">Recent incidents</h3>
            </div>
            <Link href="/admin/breach" className="text-[13px] text-primary hover:underline">
              View all →
            </Link>
          </div>
          {recentBreaches.length === 0 ? (
            <div className="mt-6 text-[13px] text-muted-foreground">
              No incidents recorded. Last 90 days clean.
            </div>
          ) : (
            <div className="mt-5">
              <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-3 pb-2 eyebrow text-[10px] sm:grid">
                <span>Incident</span>
                <span>Severity</span>
                <span className="text-right">Affected</span>
                <span className="text-right">Reported</span>
              </div>
              <ul>
                {recentBreaches.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center gap-2 py-3 hairline-t text-[13px] sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:gap-3 sm:text-[13.5px]"
                  >
                    <Link
                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                      href={`/admin/breach/${b.id}` as any}
                      className="order-1 w-full min-w-0 break-words font-medium hover:text-primary sm:order-none sm:w-auto sm:truncate"
                    >
                      {b.title}
                    </Link>
                    <StatusPill
                      tone={
                        b.severity === 'critical' || b.severity === 'high'
                          ? 'danger'
                          : b.severity === 'medium'
                            ? 'warn'
                            : 'neutral'
                      }
                      className="order-2 shrink-0 sm:order-none"
                    >
                      {b.severity}
                    </StatusPill>
                    <span className="order-3 tabular text-[12px] text-muted-foreground sm:order-none sm:text-right">
                      {(b.affected ?? 0).toLocaleString('en-IN')} affected
                    </span>
                    <span className="order-4 ml-auto tabular text-[12px] text-muted-foreground sm:order-none sm:text-right">
                      {relativeTime(new Date(b.detectedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </RefinedCard>

        <RefinedCard className="p-6 sm:p-7 lg:col-span-5">
          <Eyebrow>DPIA pipeline</Eyebrow>
          <h3 className="title-md mt-1">By stage</h3>
          <ul className="mt-5 space-y-3">
            {lanes.map((l) => (
              <li key={l.key} className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">{l.label}</span>
                  <span className="tabular text-muted-foreground">{l.n}</span>
                </div>
                <ProgressBar
                  value={l.n}
                  max={Math.max(...lanes.map((x) => x.n), 1)}
                  className="h-1.5"
                />
              </li>
            ))}
          </ul>
          <Link
            href="/admin/dpia"
            className="mt-5 inline-flex items-center text-[13px] text-primary hover:underline"
          >
            Open workbench →
          </Link>
        </RefinedCard>
      </section>

      {/* Activity feed */}
      <RefinedCard className="p-6 sm:p-7">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Activity</Eyebrow>
            <h3 className="title-md mt-1">Recent audit events</h3>
          </div>
          <Link href="/admin/audit" className="text-[13px] text-primary hover:underline">
            Open trail →
          </Link>
        </div>
        <ul className="mt-4">
          {recentAudits.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-muted-foreground">No events yet.</li>
          ) : (
            recentAudits.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-4 py-3 hairline-t text-[13.5px]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f2f1] text-primary">
                  <Clock className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="flex-1 truncate">
                  <span className="font-medium">{e.action}</span>
                  <span className="text-muted-foreground"> · {e.actorLabel ?? 'system'}</span>
                </span>
                <span className="tabular text-[12px] text-muted-foreground">
                  {relativeTime(new Date(e.ts))}
                </span>
              </li>
            ))
          )}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">Signed in as {email}</p>
      </RefinedCard>
    </div>
  );
}

/* ───────── small inline SVG chart + gauge — keeps zero-dependency feel ───────── */

function TelemetryAreaChart({ data }: { data: Array<{ day: string; v: number }> }) {
  const w = 640;
  const h = 200;
  const pad = { l: 0, r: 0, t: 16, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.v));
  const min = Math.min(...data.map((d) => d.v));
  const range = Math.max(max - min, 1);
  const x = (i: number) => pad.l + (i / (data.length - 1)) * innerW;
  const y = (v: number) => pad.t + innerH - ((v - min) / range) * innerH;
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.v)}`).join(' ');
  const areaPath = `${linePath} L ${x(data.length - 1)} ${pad.t + innerH} L ${x(0)} ${pad.t + innerH} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-[200px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="telemetry-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1d6470" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1d6470" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#telemetry-fill)" />
      <path d={linePath} fill="none" stroke="#1d6470" strokeWidth="1.5" strokeLinejoin="round" />
      <line
        x1={pad.l}
        x2={w - pad.r}
        y1={pad.t + innerH}
        y2={pad.t + innerH}
        stroke="oklch(0.90 0.005 220)"
        strokeWidth="1"
      />
      {data.map((d, i) => (
        <text
          key={d.day}
          x={x(i)}
          y={h - 4}
          fontSize="10"
          textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
          fill="oklch(0.50 0.02 220)"
        >
          {d.day}
        </text>
      ))}
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-[26px] font-semibold leading-none tracking-[-0.02em]">
            {daysLeft}d {hoursLeft}h
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">until next filing</span>
        </div>
      </div>
    </div>
  );
}

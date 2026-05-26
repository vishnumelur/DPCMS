import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { RFP_REQUIREMENTS, summariseStatus } from '@/lib/rfp/matrix-data';
import type { RfpRequirement, RfpStatus } from '@/lib/rfp/types';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  ProgressBar,
  PillLink,
} from '@/components/ui-refined/refined';
import { CheckCircle2, Sparkles, CircleAlert, ArrowUpRight, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

type StatusFilter = 'all' | RfpStatus;
type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
const STATUS_TONE: Record<RfpStatus, Tone> = {
  RA: 'ok',
  CA: 'warn',
  NA: 'danger',
};

function statusLabel(s: RfpStatus, dict: { ra: string; ca: string; na: string }) {
  return s === 'RA' ? dict.ra : s === 'CA' ? dict.ca : dict.na;
}

function groupByModule(rows: RfpRequirement[]) {
  const map = new Map<string, RfpRequirement[]>();
  for (const r of rows) {
    if (!map.has(r.module)) map.set(r.module, []);
    map.get(r.module)!.push(r);
  }
  return map;
}

function moduleRollup(rows: RfpRequirement[]) {
  const counts: Record<RfpStatus, number> = { RA: 0, CA: 0, NA: 0 };
  for (const r of rows) counts[r.status]++;
  return counts;
}

export default async function RfpMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const rawFilter = (sp.status ?? 'all').toUpperCase();
  const filter: StatusFilter =
    rawFilter === 'RA' || rawFilter === 'CA' || rawFilter === 'NA' ? rawFilter : 'all';

  const counts = summariseStatus();
  const total = RFP_REQUIREMENTS.length;
  const visible =
    filter === 'all' ? RFP_REQUIREMENTS : RFP_REQUIREMENTS.filter((r) => r.status === filter);
  const grouped = groupByModule(visible);
  const allGrouped = groupByModule(RFP_REQUIREMENTS);

  const t = await getTranslations('matrix');
  const dict = { ra: t('raLabel'), ca: t('caLabel'), na: t('naLabel') };

  const filterChips: Array<{ key: StatusFilter; label: string; n: number }> = [
    { key: 'all', label: 'All', n: total },
    { key: 'RA', label: dict.ra, n: counts.RA },
    { key: 'CA', label: dict.ca, n: counts.CA },
    { key: 'NA', label: dict.na, n: counts.NA },
  ];

  const overallPct = total > 0 ? Math.round((counts.RA / total) * 100) : 0;

  return (
    <div className="-mx-4 sm:-mx-0">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-[-12rem] h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, oklch(0.78 0.10 195 / 0.40), transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-[1120px] px-4 pt-10 pb-10 sm:px-6 sm:pt-14 sm:pb-14">
          <Eyebrow teal>RFP · KBIT/PMU/088/25-26</Eyebrow>
          <h1 className="mt-2 text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[44px] sm:leading-[1.05]">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-[640px] text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
            {t('subtitle')} Every requirement below maps to a working screen and an audit-grade
            evidence trail — click through to verify any row in seconds.
          </p>
        </div>
      </section>

      {/* OVERALL ROLLUP */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <RollupTile
            value={`${total}`}
            label="Requirements catalogued"
            sub="Representative subset of Annexures I & II"
            tone="neutral"
          />
          <RollupTile
            value={`${counts.RA}`}
            label={dict.ra}
            sub="Live in the demo system right now"
            tone="ok"
          />
          <RollupTile
            value={`${counts.CA}`}
            label={dict.ca}
            sub="Adjustable by configuration"
            tone="warn"
          />
          <RollupTile
            value={`${counts.NA}`}
            label={dict.na}
            sub="Slated for a later iteration"
            tone="danger"
          />
        </div>
        <div className="mx-auto max-w-[1120px] px-4 pb-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-2 pb-2">
            <Eyebrow>Overall readiness</Eyebrow>
            <span className="tabular text-[12.5px] font-semibold">
              {overallPct}% ready · {counts.RA} of {total}
            </span>
          </div>
          <ProgressBar value={counts.RA} max={total || 1} className="h-2" />
        </div>
      </section>

      {/* FILTER BAR */}
      <section className="sticky top-14 z-20 frosted">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Filter
          </span>
          {filterChips.map((c) => {
            const isActive = filter === c.key;
            const href =
              c.key === 'all'
                ? { pathname: '/rfp-matrix' as const }
                : { pathname: '/rfp-matrix' as const, query: { status: c.key } };
            return (
              <Link
                key={c.key}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>{c.label}</span>
                <span
                  className={`tabular text-[10.5px] ${isActive ? 'text-primary-foreground/85' : 'text-foreground/65'}`}
                >
                  {c.n}
                </span>
              </Link>
            );
          })}
          <span className="ml-auto hidden text-[12px] text-muted-foreground sm:inline">
            Showing {visible.length} of {total}
          </span>
        </div>
      </section>

      {/* MODULE SECTIONS */}
      <section className="mx-auto max-w-[1120px] px-4 pt-8 pb-20 sm:px-6 sm:pt-10 sm:pb-28">
        {grouped.size === 0 ? (
          <RefinedCard className="p-10 text-center">
            <p className="text-[14px] text-muted-foreground">
              No requirements match this filter. Try another status above.
            </p>
          </RefinedCard>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {Array.from(grouped.entries()).map(([moduleName, rows]) => {
              const fullRows = allGrouped.get(moduleName) ?? rows;
              const fullCounts = moduleRollup(fullRows);
              const fullTotal = fullRows.length;
              const pct = fullTotal > 0 ? Math.round((fullCounts.RA / fullTotal) * 100) : 0;
              return (
                <div key={moduleName} className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <Eyebrow teal>{moduleName}</Eyebrow>
                      <p className="text-[14px] text-muted-foreground">
                        {rows.length}
                        {filter === 'all' ? '' : ` of ${fullTotal}`} requirement
                        {fullTotal === 1 ? '' : 's'} · {fullCounts.RA} live ·{' '}
                        {fullCounts.CA} configurable ·{' '}
                        {fullCounts.NA} not yet
                      </p>
                    </div>
                    <div className="flex w-full max-w-[280px] items-center gap-3 sm:w-[260px]">
                      <ProgressBar value={fullCounts.RA} max={fullTotal || 1} />
                      <span className="tabular text-[12.5px] font-semibold shrink-0">{pct}%</span>
                    </div>
                  </div>

                  <RefinedCard className="overflow-hidden p-0">
                    <ul>
                      {rows.map((r, idx) => (
                        <li
                          key={r.id}
                          className={`p-5 sm:p-6 ${idx > 0 ? 'hairline-t' : ''}`}
                        >
                          {/* Top row: ID + status + section meta + RA shorthand */}
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[11.5px] font-semibold tracking-tight">
                              {r.id}
                            </code>
                            <StatusPill tone={STATUS_TONE[r.status]}>
                              {r.status === 'RA' ? (
                                <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                              ) : r.status === 'CA' ? (
                                <Sparkles className="h-3 w-3" strokeWidth={2} />
                              ) : (
                                <CircleAlert className="h-3 w-3" strokeWidth={2} />
                              )}
                              {statusLabel(r.status, dict)}
                            </StatusPill>
                            <span className="text-[11.5px] text-muted-foreground">
                              {r.section}
                              <span className="mx-1.5 opacity-50">·</span>#{r.number}
                            </span>
                          </div>

                          {/* Requirement text */}
                          <p className="mt-3 break-words text-[14px] leading-[1.55] sm:text-[14.5px]">
                            {r.text}
                          </p>

                          {/* Action footer */}
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px]">
                            {r.demoPath ? (
                              <Link
                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                href={r.demoPath as any}
                                className="inline-flex items-center gap-1.5 rounded-full hairline px-3 py-1.5 font-medium hover:bg-muted/60"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                                Open live screen
                              </Link>
                            ) : null}
                            {r.evidencePath ? (
                              <Link
                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                href={r.evidencePath as any}
                                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                                View evidence
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </RefinedCard>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6 sm:py-12">
          <div className="min-w-0 space-y-1">
            <Eyebrow>Verify any row</Eyebrow>
            <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.015em] sm:text-[24px]">
              Sign in to inspect the live system end-to-end.
            </h3>
            <p className="max-w-[640px] text-[13.5px] text-muted-foreground sm:text-[14px]">
              Demo credentials are pre-seeded. Every row above links to the screen that proves it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PillLink href="/signin">Sign in →</PillLink>
            <PillLink href="/" variant="ghost">
              Back to home
            </PillLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function RollupTile({
  value,
  label,
  sub,
  tone,
}: {
  value: string;
  label: string;
  sub: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
}) {
  const colorClass =
    tone === 'ok'
      ? 'text-[#0a7d52]'
      : tone === 'warn'
        ? 'text-[#a85d00]'
        : tone === 'danger'
          ? 'text-[#b42318]'
          : 'text-foreground';
  return (
    <div className="space-y-1.5">
      <p
        className={`text-[34px] font-semibold leading-none tracking-[-0.025em] tabular sm:text-[40px] ${colorClass}`}
      >
        {value}
      </p>
      <p className="text-[13px] font-semibold text-foreground">{label}</p>
      <p className="text-[12px] leading-snug text-muted-foreground">{sub}</p>
    </div>
  );
}

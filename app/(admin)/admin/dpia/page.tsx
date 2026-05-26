import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  PillLink,
  ProgressBar,
} from '@/components/ui-refined/refined';
import { listAssessments, getAssessment, listResponses } from '@/modules/assessment/service';
import { ShieldCheck, Clock, Filter, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
const RISK_TONE: Record<string, Tone> = {
  low: 'ok',
  medium: 'warn',
  high: 'danger',
  severe: 'danger',
};
const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  in_review: 'warn',
  approved: 'ok',
  archived: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  archived: 'Archived',
};

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function initials(s: string) {
  return s
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function AdminDpiaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const rows = await listAssessments(u.orgId, 'dpia');
  const params = await searchParams;
  const selectedId = params.id ?? rows[0]?.id ?? null;
  const selected = selectedId
    ? rows.find((r) => r.id === selectedId) ?? null
    : null;
  const detail = selectedId ? await getAssessment(u.orgId, selectedId).catch(() => null) : null;
  const responses = selectedId ? await listResponses(selectedId).catch(() => []) : [];

  const pipelineCount = rows.length;
  const awaitingBoard = rows.filter((r) => r.status === 'in_review').length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <Eyebrow>Compliance · DPIAs</Eyebrow>
          <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.025em] [text-wrap:balance] sm:text-[32px] sm:leading-[38px]">
            Data Protection Impact Assessments
          </h1>
          <p className="text-[14px] text-muted-foreground sm:text-[15px]">
            {pipelineCount} in pipeline · {awaitingBoard} awaiting board approval
          </p>
        </div>
        <PillLink href="/admin/dpia/new" className="self-start whitespace-nowrap sm:self-auto">
          + New DPIA
        </PillLink>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT — list */}
        <RefinedCard className="p-5 sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            <div className="seg-track w-max max-w-full shrink-0">
              {['All', 'Mine', 'Awaiting me', 'Overdue'].map((s, i) => (
                <span key={s} data-active={i === 0 ? 'true' : 'false'} className="seg-item">
                  {s}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="hidden shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground sm:inline-flex"
            >
              <Filter className="h-3.5 w-3.5" strokeWidth={1.5} /> Filter
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="search"
              placeholder="Search DPIAs…"
              className="flex-1 bg-transparent text-[14px] outline-none"
            />
          </div>

          {rows.length === 0 ? (
            <div className="mt-8 text-center text-[13px] text-muted-foreground">
              No DPIAs yet. Create one to begin.
            </div>
          ) : (
            <ul className="mt-3">
              {rows.map((r) => {
                const active = r.id === selectedId;
                return (
                  <li key={r.id}>
                    <Link
                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                      href={`/admin/dpia?id=${r.id}` as any}
                      className={`relative flex flex-wrap items-center gap-2 px-2 py-3 hairline-t text-[13.5px] ${
                        active ? 'bg-[#fcfeff]' : ''
                      }`}
                      data-active={active}
                    >
                      {active ? (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                      ) : null}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                        {initials(r.title)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.title}</span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          DPIA-{r.id.slice(0, 4).toUpperCase()} · {relativeTime(new Date(r.createdAt))}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {r.riskLevel ? (
                          <StatusPill tone={RISK_TONE[r.riskLevel] ?? 'neutral'}>
                            {r.riskLevel}
                          </StatusPill>
                        ) : null}
                        <StatusPill tone={STATUS_TONE[r.status] ?? 'neutral'}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </StatusPill>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </RefinedCard>

        {/* RIGHT — detail */}
        <RefinedCard className="p-5 sm:p-7 lg:col-span-7">
          {!detail || !selected ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
              <ShieldCheck
                className="h-10 w-10 text-muted-foreground"
                strokeWidth={1.2}
              />
              <p className="mt-3 text-[14px] text-muted-foreground">
                Pick a DPIA on the left to see its risk profile.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1">
                  <Eyebrow teal>DPIA · {STATUS_LABEL[detail.status] ?? detail.status}</Eyebrow>
                  <h2 className="break-words text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] [text-wrap:balance] sm:text-[24px] sm:leading-[30px]">
                    {detail.title}
                  </h2>
                  <p className="break-words text-[12.5px] text-muted-foreground sm:text-[13px]">
                    Created {new Date(detail.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · DPIA-{detail.id.slice(0, 6).toUpperCase()}
                  </p>
                </div>
                <div className="shrink-0">
                  {detail.status === 'in_review' ? (
                    <button type="button" className="btn-pill whitespace-nowrap">
                      Approve & sign
                    </button>
                  ) : detail.status === 'draft' ? (
                    <button type="button" className="btn-pill whitespace-nowrap">
                      Submit for review
                    </button>
                  ) : (
                    <StatusPill tone={STATUS_TONE[detail.status] ?? 'neutral'}>
                      {STATUS_LABEL[detail.status] ?? detail.status}
                    </StatusPill>
                  )}
                </div>
              </div>

              {/* Risk summary */}
              <div className="mt-7 space-y-3">
                <div className="flex items-center justify-between text-[12px]">
                  {['Inherent', 'Mitigation', 'Residual', 'Threshold'].map((l) => (
                    <span key={l} className="text-muted-foreground">
                      {l}
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <ProgressBar value={detail.riskScore ?? 0} max={100} className="h-2" />
                  {detail.riskScore != null ? (
                    <span
                      className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full bg-background ring-2 ring-primary"
                      style={{
                        left: `${Math.max(2, Math.min(98, detail.riskScore))}%`,
                      }}
                    />
                  ) : null}
                </div>
                <p className="text-[12.5px] text-muted-foreground">
                  Residual risk{' '}
                  {detail.riskLevel ? (
                    <StatusPill tone={RISK_TONE[detail.riskLevel] ?? 'neutral'} className="mx-1">
                      {detail.riskLevel}
                    </StatusPill>
                  ) : null}
                  {detail.riskLevel === 'low' || detail.riskLevel === 'medium'
                    ? '— below board threshold.'
                    : '— above board threshold, escalation required.'}
                </p>
              </div>

              {/* Tabs — horizontally scrollable on narrow viewports */}
              <div className="hairline-b mt-6 overflow-x-auto">
                <div className="flex w-max gap-5 text-[13.5px] sm:gap-6 sm:text-[14px]">
                  {['Overview', 'Data flows', 'Risks', 'Mitigations', 'Sign-offs'].map((t, i) => (
                    <span
                      key={t}
                      className={`relative -mb-px shrink-0 whitespace-nowrap py-2.5 ${
                        i === 2
                          ? 'border-b-[1.5px] border-primary font-semibold text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Risk table */}
              <div className="mt-5">
                {responses.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    No risks logged. Open the assessment editor to add them.
                  </p>
                ) : (
                  <>
                    {/* Desktop risk table (sm+) */}
                    <div className="hidden sm:block">
                      <div className="grid grid-cols-[1fr_72px_72px_72px_80px] gap-3 pb-2 eyebrow text-[10px]">
                        <span>Risk</span>
                        <span>Likely</span>
                        <span>Impact</span>
                        <span>Score</span>
                        <span className="text-right">Action</span>
                      </div>
                      <ul>
                        {responses.slice(0, 6).map((r) => (
                          <li
                            key={r.id}
                            className="grid grid-cols-[1fr_72px_72px_72px_80px] items-center gap-3 py-3 hairline-t text-[13.5px]"
                          >
                            <span className="min-w-0 truncate">
                              {r.questionLabel || r.questionKey}
                              {r.answer ? (
                                <span className="ml-2 text-muted-foreground">
                                  · {r.answer.slice(0, 40)}
                                </span>
                              ) : null}
                            </span>
                            <Dots filled={Math.min(5, Math.max(0, r.score ?? 0))} />
                            <Dots filled={Math.min(5, Math.max(0, r.score ?? 0))} />
                            <StatusPill
                              tone={
                                (r.score ?? 0) >= 4
                                  ? 'danger'
                                  : (r.score ?? 0) >= 2
                                    ? 'warn'
                                    : 'ok'
                              }
                            >
                              {r.score ?? 0}
                            </StatusPill>
                            <Link
                              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                              href={`/admin/dpia/${detail.id}` as any}
                              className="text-right text-[12.5px] text-primary hover:underline"
                            >
                              View →
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mobile risk cards (below sm) */}
                    <ul className="space-y-3 sm:hidden">
                      {responses.slice(0, 6).map((r) => (
                        <li key={r.id} className="hairline rounded-[12px] p-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill
                              tone={
                                (r.score ?? 0) >= 4
                                  ? 'danger'
                                  : (r.score ?? 0) >= 2
                                    ? 'warn'
                                    : 'ok'
                              }
                            >
                              score {r.score ?? 0}
                            </StatusPill>
                            <Link
                              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                              href={`/admin/dpia/${detail.id}` as any}
                              className="ml-auto shrink-0 text-[12.5px] text-primary hover:underline"
                            >
                              View →
                            </Link>
                          </div>
                          <p className="mt-2 break-words text-[13px] font-medium">
                            {r.questionLabel || r.questionKey}
                          </p>
                          {r.answer ? (
                            <p className="mt-1 break-words text-[12px] text-muted-foreground">
                              {r.answer.slice(0, 90)}
                              {r.answer.length > 90 ? '…' : ''}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              likely
                              <Dots filled={Math.min(5, Math.max(0, r.score ?? 0))} />
                            </span>
                            <span className="flex items-center gap-1.5">
                              impact
                              <Dots filled={Math.min(5, Math.max(0, r.score ?? 0))} />
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Sign-off rail */}
              <div className="mt-7 hairline-t pt-5">
                <Eyebrow>Sign-offs</Eyebrow>
                <ul className="mt-3 flex flex-wrap items-center gap-3">
                  {[
                    { role: 'DPO', signed: detail.status !== 'draft' },
                    { role: 'Legal', signed: detail.status === 'approved' },
                    { role: 'CISO', signed: detail.status === 'approved' },
                  ].map((s) => (
                    <li
                      key={s.role}
                      className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1.5 text-[12.5px]"
                    >
                      {s.signed ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      )}
                      <span className="font-medium">{s.role}</span>
                      <span className="text-muted-foreground">
                        {s.signed ? 'Signed' : 'Pending'}
                      </span>
                    </li>
                  ))}
                  <Link
                    href="/admin/audit"
                    className="ml-auto text-[12.5px] text-primary hover:underline"
                  >
                    Open audit trail →
                  </Link>
                </ul>
              </div>

              <Link
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                href={`/admin/dpia/${detail.id}` as any}
                className="mt-6 inline-flex btn-pill-ghost"
              >
                Open full assessment →
              </Link>
            </>
          )}
        </RefinedCard>
      </div>
    </div>
  );
}

function Dots({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < filled ? 'bg-primary' : 'bg-muted-foreground/25'}`}
        />
      ))}
    </span>
  );
}

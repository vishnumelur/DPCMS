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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listIncidents, BREACH_SEVERITIES } from '@/modules/breach/service';
import { declareBreachAction } from '@/lib/actions/breach';
import { Clock, Shield, AlertOctagon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
const SEVERITY_TONE: Record<string, Tone> = {
  low: 'neutral',
  medium: 'warn',
  high: 'danger',
  critical: 'danger',
};
const STATUS_TONE: Record<string, Tone> = {
  detected: 'danger',
  assessing: 'warn',
  contained: 'ok',
  reported_dpb: 'info',
  closed: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  detected: 'Detected',
  assessing: 'Investigating',
  contained: 'Contained',
  reported_dpb: 'Notified',
  closed: 'Closed',
};

function timeRemaining(deadlineAt: Date | null): {
  pct: number;
  label: string;
  expired: boolean;
} {
  if (!deadlineAt) return { pct: 0, label: 'No deadline', expired: false };
  const diffMs = deadlineAt.getTime() - Date.now();
  const totalWindow = 72 * 3600 * 1000;
  const pct = Math.max(0, Math.min(100, (diffMs / totalWindow) * 100));
  if (diffMs <= 0) return { pct: 0, label: 'Overdue', expired: true };
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return { pct, label: `${h}h ${m}m left`, expired: false };
}

export default async function AdminBreachPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const incidents = await listIncidents(u.orgId);

  const activeClock = incidents.find(
    (i) =>
      i.status !== 'closed' &&
      i.reportingDeadlineAt &&
      new Date(i.reportingDeadlineAt).getTime() > Date.now(),
  );

  const severityHistogram: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const i of incidents) {
    if (i.severity in severityHistogram) {
      severityHistogram[i.severity] = (severityHistogram[i.severity] ?? 0) + 1;
    }
  }
  const maxSev = Math.max(...Object.values(severityHistogram), 1);

  // Synthesised regulator status — replace with real lookups when notification log lands.
  const regulators = [
    {
      who: 'DPB India',
      ref: 'Receipt #DPB-2026-9991',
      status: 'Notified · 04 Jun 14:02 IST',
      tone: 'info' as Tone,
    },
    { who: 'RBI Cyber Cell', ref: '', status: 'Pending · within 6h', tone: 'warn' as Tone },
    { who: 'CERT-In', ref: '', status: 'Notified · 04 Jun 13:58 IST', tone: 'info' as Tone },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <Eyebrow>Compliance · Breach register</Eyebrow>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[32px] sm:leading-[38px]">
            Breach register
          </h1>
          <p className="text-[14px] text-muted-foreground sm:text-[15px]">
            DPDP §8(6) · 72-hour mandatory notification window enforced.
          </p>
        </div>
        <PillLink href="#declare" className="self-start whitespace-nowrap sm:self-auto">
          + Report incident
        </PillLink>
      </section>

      {activeClock ? (
        <RefinedCard className="overflow-hidden p-0">
          <div className="flex gap-4 p-5 sm:gap-5 sm:p-6">
            <div className="w-1 shrink-0 self-stretch rounded-full bg-[#b42318]" />
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 space-y-1">
                <p className="title-md break-words">
                  {(() => {
                    const r = timeRemaining(new Date(activeClock.reportingDeadlineAt!));
                    return `1 active 72-hour clock — ${r.label}`;
                  })()}
                </p>
                <p className="break-words text-[13px] text-muted-foreground">
                  {activeClock.title} ·{' '}
                  {(activeClock.estimatedAffectedCount ?? 0).toLocaleString('en-IN')} data
                  principals affected
                </p>
              </div>
              <Link
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                href={`/admin/breach/${activeClock.id}` as any}
                className="btn-pill-ghost self-start whitespace-nowrap sm:self-auto"
              >
                Open incident →
              </Link>
            </div>
          </div>
        </RefinedCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RefinedCard className="p-5 sm:p-7 lg:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <Eyebrow>Incidents</Eyebrow>
              <h3 className="title-md mt-1">{incidents.length} on record</h3>
            </div>
            <div className="seg-track w-max max-w-full overflow-x-auto">
              {['All', 'Active', 'Notified', 'Closed'].map((s, i) => (
                <span key={s} data-active={i === 0 ? 'true' : 'false'} className="seg-item">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="mt-8 text-center text-[13px] text-muted-foreground">
              No incidents recorded. Declare one below to start the lifecycle.
            </div>
          ) : (
            <div className="mt-5">
              {/* Desktop table — sm+ */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-[110px_1fr_90px_110px_130px_90px] gap-3 pb-2 eyebrow text-[10px]">
                  <span>INC ID</span>
                  <span>Title</span>
                  <span>Severity</span>
                  <span>Status</span>
                  <span>72h Clock</span>
                  <span className="text-right">Affected</span>
                </div>
                <ul>
                  {incidents.map((i) => {
                    const clock = timeRemaining(
                      i.reportingDeadlineAt ? new Date(i.reportingDeadlineAt) : null,
                    );
                    return (
                      <li
                        key={i.id}
                        className="grid grid-cols-[110px_1fr_90px_110px_130px_90px] items-center gap-3 py-3 hairline-t text-[13.5px]"
                      >
                        <Link
                          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          href={`/admin/breach/${i.id}` as any}
                          className="truncate font-mono text-[12px] hover:text-primary"
                        >
                          INC-{i.id.slice(0, 4).toUpperCase()}
                        </Link>
                        <span className="truncate">{i.title}</span>
                        <StatusPill tone={SEVERITY_TONE[i.severity] ?? 'neutral'}>
                          {i.severity}
                        </StatusPill>
                        <StatusPill tone={STATUS_TONE[i.status] ?? 'neutral'}>
                          {STATUS_LABEL[i.status] ?? i.status}
                        </StatusPill>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="w-10 shrink-0">
                            <ProgressBar value={clock.pct} max={100} />
                          </div>
                          <span
                            className={`tabular text-[11.5px] truncate ${clock.expired ? 'text-[#b42318]' : 'text-muted-foreground'}`}
                          >
                            {i.status === 'closed' ? 'Paused' : clock.label}
                          </span>
                        </div>
                        <span className="tabular text-right text-muted-foreground">
                          {(i.estimatedAffectedCount ?? 0).toLocaleString('en-IN')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Mobile / tablet card list — below lg */}
              <ul className="space-y-3 lg:hidden">
                {incidents.map((i) => {
                  const clock = timeRemaining(
                    i.reportingDeadlineAt ? new Date(i.reportingDeadlineAt) : null,
                  );
                  return (
                    <li
                      key={i.id}
                      className="hairline rounded-[12px] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          href={`/admin/breach/${i.id}` as any}
                          className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[11.5px] font-semibold hover:text-primary"
                        >
                          INC-{i.id.slice(0, 4).toUpperCase()}
                        </Link>
                        <StatusPill tone={SEVERITY_TONE[i.severity] ?? 'neutral'}>
                          {i.severity}
                        </StatusPill>
                        <StatusPill tone={STATUS_TONE[i.status] ?? 'neutral'}>
                          {STATUS_LABEL[i.status] ?? i.status}
                        </StatusPill>
                      </div>
                      <p className="mt-3 break-words text-[14px] font-medium">{i.title}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-12 shrink-0">
                            <ProgressBar value={clock.pct} max={100} />
                          </span>
                          <span
                            className={`tabular ${clock.expired ? 'text-[#b42318]' : 'text-muted-foreground'}`}
                          >
                            {i.status === 'closed' ? 'Paused' : clock.label}
                          </span>
                        </span>
                        <span className="tabular text-muted-foreground">
                          {(i.estimatedAffectedCount ?? 0).toLocaleString('en-IN')} affected
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </RefinedCard>

        <div className="space-y-4 lg:col-span-4">
          <RefinedCard className="p-6 sm:p-7">
            <Eyebrow>Severity distribution</Eyebrow>
            <h3 className="title-md mt-1">Last 90 days</h3>
            <ul className="mt-5 space-y-3">
              {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                <li key={sev} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="capitalize">{sev}</span>
                    <span className="tabular text-muted-foreground">
                      {severityHistogram[sev] ?? 0}
                    </span>
                  </div>
                  <ProgressBar value={severityHistogram[sev] ?? 0} max={maxSev} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-muted-foreground">
              {incidents.length} incidents · {severityHistogram.critical ?? 0} Critical
            </p>
          </RefinedCard>

          <RefinedCard className="p-6 sm:p-7">
            <Eyebrow>Regulator notification</Eyebrow>
            <h3 className="title-md mt-1">Status</h3>
            <ul className="mt-4 space-y-3">
              {regulators.map((r) => (
                <li key={r.who} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2">
                    {r.who === 'DPB India' ? (
                      <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    ) : r.who === 'RBI Cyber Cell' ? (
                      <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    ) : (
                      <AlertOctagon
                        className="h-4 w-4 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                    <span>
                      <span className="font-medium">{r.who}</span>
                      {r.ref ? (
                        <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                          · {r.ref}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <StatusPill tone={r.tone}>{r.status.split(' · ')[0]}</StatusPill>
                </li>
              ))}
            </ul>
            <Link
              href="/admin/audit"
              className="mt-4 inline-flex text-[13px] text-primary hover:underline"
            >
              View notification log →
            </Link>
          </RefinedCard>
        </div>
      </div>

      <RefinedCard className="p-6 sm:p-7" id="declare">
        <Eyebrow>Declaration</Eyebrow>
        <h3 className="title-md mt-1">Report a new incident</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The 72-hour clock starts at detection. Be precise about what is known and what is being
          investigated.
        </p>
        <form action={declareBreachAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Unauthorised access to KYC bucket"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              className="flex w-full rounded-[10px] border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="What happened, when, and who reported it."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity</Label>
            <select
              id="severity"
              name="severity"
              className="flex h-10 w-full rounded-[10px] border border-input bg-transparent px-3 text-sm"
              defaultValue="medium"
            >
              {BREACH_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimatedAffectedCount">Estimated affected count</Label>
            <Input
              id="estimatedAffectedCount"
              name="estimatedAffectedCount"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="affectedDataCategories">
              Affected data categories (comma-separated)
            </Label>
            <Input
              id="affectedDataCategories"
              name="affectedDataCategories"
              placeholder="identity, contact, account_number"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-pill">
              Declare incident
            </button>
          </div>
        </form>
      </RefinedCard>
    </div>
  );
}

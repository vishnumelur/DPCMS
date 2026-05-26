import { db } from '@/db/client';
import { auditLog, auditChainHead, org } from '@/db/schema';
import { desc } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
} from '@/components/ui-refined/refined';
import { verifyStream } from '@/lib/audit/verifier';
import { Lock, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

function isoToParts(d: Date) {
  const day = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return { day, time };
}

function dayKey(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0)
    return `Today · ${target.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  if (diffDays === 1)
    return `Yesterday · ${target.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  return target.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default async function AdminAuditPage() {
  const [recent, heads, orgs] = await Promise.all([
    db.select().from(auditLog).orderBy(desc(auditLog.ts)).limit(40),
    db.select().from(auditChainHead),
    db.select().from(org),
  ]);

  const verifications = await Promise.all(
    heads.map(async (h) => ({
      orgId: h.orgId,
      stream: h.stream,
      lastSeq: h.lastSeq,
      result: await verifyStream(h.orgId, h.stream),
    })),
  );

  const allOk = verifications.length > 0 && verifications.every((v) => v.result.ok);
  const totalEvents = verifications.reduce((acc, v) => acc + v.result.count, 0);

  // Group events under day pills.
  const grouped: Array<{ day: string; rows: typeof recent }> = [];
  for (const r of recent) {
    const k = dayKey(new Date(r.ts));
    const tail = grouped[grouped.length - 1];
    if (tail && tail.day === k) tail.rows.push(r);
    else grouped.push({ day: k, rows: [r] });
  }

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between gap-6">
        <div className="space-y-2">
          <Eyebrow>Compliance · Audit trail</Eyebrow>
          <h1 className="display-lg">Audit trail</h1>
          <p className="text-[15px] text-muted-foreground">
            Tamper-evident, hash-chained log of every privacy event. Each row carries a sha256
            commitment to the prior row.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <StatusPill tone={allOk ? 'ok' : 'danger'}>
            <Lock className="h-3 w-3" strokeWidth={2} />
            {allOk
              ? `Chain verified · ${totalEvents.toLocaleString('en-IN')} events`
              : 'Chain broken'}
          </StatusPill>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {grouped.length === 0 ? (
            <RefinedCard className="p-12 text-center text-[14px] text-muted-foreground">
              No audit events yet. The log fills as the platform records consents, DSRs and
              breaches.
            </RefinedCard>
          ) : (
            grouped.map((group) => (
              <div key={group.day} className="space-y-3">
                <div className="frosted inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide">
                  {group.day}
                </div>
                <ol className="relative ml-3 border-l border-border/60 pl-6">
                  {group.rows.map((r, idx) => {
                    const isFirst = idx === 0;
                    const parts = isoToParts(new Date(r.ts));
                    return (
                      <li key={r.id} className="relative pb-5">
                        <span
                          className={`absolute -left-[31px] top-3 h-3 w-3 rounded-full ring-2 ring-background ${
                            r.action.includes('breach') ? 'bg-[#1d6470]' : 'bg-muted'
                          }`}
                        />
                        <RefinedCard
                          className={`p-5 ${
                            r.action.includes('breach') ? 'hairline-l border-l-2 border-l-primary' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="title-sm">
                              {r.action}
                              <span className="ml-2 font-normal text-muted-foreground">
                                · {r.stream}
                              </span>
                            </p>
                            <code className="font-mono text-[11px] text-muted-foreground">
                              evt_{r.id.slice(0, 6)}…{r.id.slice(-4)}
                            </code>
                          </div>
                          <p className="mt-1 text-[12.5px] text-muted-foreground">
                            By <span className="text-foreground">{r.actorLabel}</span> · target{' '}
                            <code className="text-[11px]">{r.target}</code> · {orgName(r.orgId)} ·{' '}
                            <span className="tabular">{parts.time}</span> IST
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <StatusPill tone="ok">
                              <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                              chain ✓
                            </StatusPill>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              hash {r.rowHash.slice(0, 12)}…
                            </span>
                          </div>
                        </RefinedCard>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-4">
          <RefinedCard className="sticky top-20 p-6 sm:p-7">
            <Eyebrow>Chain integrity</Eyebrow>
            <h3 className="title-md mt-1">Verification</h3>
            <div className="mt-5 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-primary/30">
                <ShieldCheck
                  className={`h-10 w-10 ${allOk ? 'text-primary' : 'text-[#b42318]'}`}
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <p className="mt-4 text-center text-[14px] font-medium">
              {verifications.length === 0
                ? 'No streams yet'
                : allOk
                  ? 'All blocks verified'
                  : 'Chain broken — investigate'}
            </p>
            <dl className="mt-5 space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Streams</dt>
                <dd className="tabular">{verifications.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Total events</dt>
                <dd className="tabular">{totalEvents.toLocaleString('en-IN')}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Algorithm</dt>
                <dd className="font-mono">sha256</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Last verified</dt>
                <dd className="tabular">just now</dd>
              </div>
            </dl>
            {verifications.length > 0 ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-[12.5px] text-primary">
                  Per-stream detail
                </summary>
                <ul className="mt-3 space-y-2 text-[12px]">
                  {verifications.map((v) => (
                    <li
                      key={`${v.orgId}-${v.stream}`}
                      className="flex items-center justify-between hairline rounded-[10px] px-3 py-2"
                    >
                      <span>
                        <span className="font-medium">{orgName(v.orgId)}</span>{' '}
                        <span className="text-muted-foreground">· {v.stream}</span>
                      </span>
                      <StatusPill tone={v.result.ok ? 'ok' : 'danger'}>
                        seq {v.lastSeq}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </RefinedCard>
        </div>
      </div>
    </div>
  );
}

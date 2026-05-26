import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice, noticeAck } from '@/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
} from '@/components/ui-refined/refined';
import { acknowledgeNoticeAction } from '@/lib/actions/consent';
import { ScrollText, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

function relativeDate(d: Date | null) {
  if (!d) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function MyNoticesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">
          Sign in to view your privacy notices.
        </p>
      </RefinedCard>
    );
  }
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">No organisation linked yet.</p>
      </RefinedCard>
    );
  }

  const notices = await db
    .select()
    .from(notice)
    .where(and(eq(notice.orgId, u.orgId), isNotNull(notice.publishedAt)))
    .orderBy(desc(notice.publishedAt));

  const acks = await db
    .select()
    .from(noticeAck)
    .where(and(eq(noticeAck.orgId, u.orgId), eq(noticeAck.principalUserId, u.id)));
  const ackedIds = new Set(acks.map((a) => a.noticeId));
  const unackedCount = notices.filter((n) => !ackedIds.has(n.id)).length;

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      {/* Hero */}
      <section className="space-y-2">
        <Eyebrow>My account</Eyebrow>
        <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[32px] sm:leading-[38px]">
          Privacy notices
        </h1>
        <p className="text-[14px] text-muted-foreground sm:text-[15px]">
          Every published notice the bank has issued. Acknowledge each to record evidence in the
          immutable audit chain. Switch language from the top bar.
        </p>
      </section>

      {/* Summary strip */}
      {notices.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="info">
            {notices.length} published
          </StatusPill>
          {unackedCount > 0 ? (
            <StatusPill tone="warn">{unackedCount} pending acknowledgement</StatusPill>
          ) : (
            <StatusPill tone="ok">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} /> all acknowledged
            </StatusPill>
          )}
        </div>
      ) : null}

      {notices.length === 0 ? (
        <RefinedCard className="p-10 text-center">
          <ScrollText
            className="mx-auto h-10 w-10 text-muted-foreground"
            strokeWidth={1.2}
          />
          <p className="mt-3 text-[14px] text-muted-foreground">
            No notices have been published yet. You will receive a notification when the bank
            issues one.
          </p>
        </RefinedCard>
      ) : (
        <ul className="space-y-3">
          {notices.map((n) => {
            const acked = ackedIds.has(n.id);
            return (
              <li key={n.id}>
                <RefinedCard className="overflow-hidden p-0">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-6">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f2f1] text-primary">
                        <ScrollText className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <h2 className="break-words text-[15.5px] font-semibold leading-snug sm:text-[16.5px]">
                          {n.title}
                        </h2>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                          <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">
                            {n.slug}
                          </code>
                          <span>v{n.version}</span>
                          <span className="opacity-50">·</span>
                          <span className="uppercase">{n.languageCode}</span>
                          {n.publishedAt ? (
                            <>
                              <span className="opacity-50">·</span>
                              <span className="tabular">
                                Published {relativeDate(new Date(n.publishedAt))}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      {acked ? (
                        <StatusPill tone="ok">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                          Acknowledged
                        </StatusPill>
                      ) : (
                        <StatusPill tone="warn">
                          <Clock className="h-3 w-3" strokeWidth={2} />
                          Pending
                        </StatusPill>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 hairline-t bg-muted/30 px-5 py-3 text-[13px] sm:px-6">
                    <Link
                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                      href={`/me/notices/${n.slug}` as any}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Read notice <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </Link>
                    {!acked ? (
                      <form action={acknowledgeNoticeAction} className="ml-auto">
                        <input type="hidden" name="noticeId" value={n.id} />
                        <button type="submit" className="btn-pill h-9 px-4 text-[12.5px]">
                          Acknowledge
                        </button>
                      </form>
                    ) : null}
                  </div>
                </RefinedCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

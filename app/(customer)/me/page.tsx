import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import {
  user,
  consentPreference,
  dsrRequest,
  notice,
  noticeAck,
  auditLog,
} from '@/db/schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
  PillLink,
  ProgressBar,
} from '@/components/ui-refined/refined';
import {
  ShieldCheck,
  FileText,
  FilePlus2,
  Download,
  Bell,
  ChevronRight,
  UserCheck,
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

function firstName(email: string) {
  const local = email.split('@')[0] ?? email;
  const part = local.split(/[._-]/)[0] ?? local;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function shortInitials(s: string) {
  return s
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default async function MeHome() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">
          Sign in to view your data principal dashboard.
        </p>
      </RefinedCard>
    );
  }

  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">
          Your account is not yet linked to an organisation. Contact KSCB support.
        </p>
      </RefinedCard>
    );
  }

  const [activeConsents, openDsrs, slaRiskDsrs, unackNotices, recentActivity, totalNotices] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(consentPreference)
        .where(
          and(
            eq(consentPreference.orgId, u.orgId),
            eq(consentPreference.principalUserId, u.id),
            eq(consentPreference.status, 'active'),
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(dsrRequest)
        .where(
          and(
            eq(dsrRequest.orgId, u.orgId),
            eq(dsrRequest.principalUserId, u.id),
            sql`${dsrRequest.status} not in ('fulfilled','rejected')`,
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(dsrRequest)
        .where(
          and(
            eq(dsrRequest.orgId, u.orgId),
            eq(dsrRequest.principalUserId, u.id),
            sql`${dsrRequest.status} not in ('fulfilled','rejected') and ${dsrRequest.createdAt} < now() - interval '21 days'`,
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(notice)
        .leftJoin(
          noticeAck,
          and(
            eq(noticeAck.noticeId, notice.id),
            eq(noticeAck.principalUserId, u.id),
          ),
        )
        .where(
          and(
            eq(notice.orgId, u.orgId),
            sql`${notice.publishedAt} is not null`,
            isNull(noticeAck.id),
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          target: auditLog.target,
          ts: auditLog.ts,
        })
        .from(auditLog)
        .where(and(eq(auditLog.orgId, u.orgId), eq(auditLog.actorUserId, u.id)))
        .orderBy(desc(auditLog.ts))
        .limit(6),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(notice)
        .where(and(eq(notice.orgId, u.orgId), sql`${notice.publishedAt} is not null`))
        .then((r) => r[0]?.n ?? 0),
    ]);

  const noticesRead = totalNotices - unackNotices;
  const noticesReadPct = totalNotices > 0 ? Math.round((noticesRead / totalNotices) * 100) : 0;

  const quickActions = [
    {
      title: 'Manage consents',
      caption: `${activeConsents} active`,
      Icon: ShieldCheck,
      href: '/me/consents',
      tone: 'teal' as const,
    },
    {
      title: 'Raise a request',
      caption: 'DSR · 30-day SLA',
      Icon: FilePlus2,
      href: '/me/requests/new',
      tone: 'neutral' as const,
    },
    {
      title: 'Read privacy notices',
      caption:
        unackNotices > 0 ? `${unackNotices} unread` : 'All caught up',
      Icon: FileText,
      href: '/me/notices',
      tone: unackNotices > 0 ? ('warn' as const) : ('neutral' as const),
    },
    {
      title: 'Download my data',
      caption: 'Access export',
      Icon: Download,
      href: '/me/data',
      tone: 'neutral' as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      {/* HERO */}
      <section className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white sm:h-14 sm:w-14 sm:text-[15px]"
          style={{
            background:
              'radial-gradient(120% 120% at 30% 20%, #4d8e95 0%, #1d6470 70%)',
          }}
        >
          {shortInitials(email)}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Eyebrow>My account</Eyebrow>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[32px] sm:leading-[38px]">
            {timeOfDayGreeting()}, {firstName(email)}.
          </h1>
          <p className="text-[13.5px] text-muted-foreground sm:text-[14.5px]">
            Your DPDP rights in one place.
          </p>
        </div>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <RefinedCard className="p-5">
          <div className="flex items-center justify-between">
            <Eyebrow>Active consents</Eyebrow>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.025em] tabular">
            {activeConsents}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {activeConsents > 0 ? 'You control these' : 'None yet — none required'}
          </p>
        </RefinedCard>
        <RefinedCard className="p-5">
          <div className="flex items-center justify-between">
            <Eyebrow>Open requests</Eyebrow>
            <UserCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.025em] tabular">
            {openDsrs}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {slaRiskDsrs > 0 ? (
              <StatusPill tone="warn" className="!h-5 !text-[10px]">
                {slaRiskDsrs} nearing SLA
              </StatusPill>
            ) : openDsrs > 0 ? (
              'All within SLA'
            ) : (
              'No requests pending'
            )}
          </p>
        </RefinedCard>
        <RefinedCard className="col-span-2 p-5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <Eyebrow>Notices read</Eyebrow>
            <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.025em] tabular">
            {noticesRead}
            <span className="ml-1 text-[14px] font-medium text-muted-foreground">
              /{totalNotices}
            </span>
          </p>
          <div className="mt-3">
            <ProgressBar value={noticesReadPct} max={100} />
          </div>
        </RefinedCard>
      </section>

      {/* Quick actions */}
      <section className="space-y-3">
        <div className="px-1">
          <Eyebrow>Quick actions</Eyebrow>
        </div>
        <RefinedCard className="overflow-hidden p-0">
          <ul>
            {quickActions.map((a, idx) => (
              <li key={a.title} className={idx > 0 ? 'hairline-t' : ''}>
                <Link
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  href={a.href as any}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 active:bg-muted/60"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${
                      a.tone === 'teal'
                        ? 'bg-[#e8f2f1] text-primary'
                        : a.tone === 'warn'
                          ? 'bg-[#fdf3e6] text-[#a85d00]'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <a.Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block title-sm">{a.title}</span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {a.caption}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
        </RefinedCard>
      </section>

      {/* Rights snapshot */}
      <RefinedCard className="p-6">
        <Eyebrow teal>Your DPDP rights</Eyebrow>
        <h3 className="title-md mt-1">Six controls, always available</h3>
        <ul className="mt-4 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
          {[
            'Access your data',
            'Correct inaccuracies',
            'Erase what we hold',
            'Withdraw consent',
            'Nominate a kin',
            'Raise grievance',
          ].map((r) => (
            <li
              key={r}
              className="flex items-center gap-2 rounded-[10px] hairline px-3 py-2"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <PillLink href="/me/requests/new" variant="ghost">
            File a request →
          </PillLink>
        </div>
      </RefinedCard>

      {/* Recent activity */}
      <RefinedCard className="p-6">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Activity</Eyebrow>
            <h3 className="title-md mt-1">Your last actions</h3>
          </div>
          <Link href="/me/activity" className="text-[13px] text-primary hover:underline">
            View all →
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-4 py-6 text-center text-[13px] text-muted-foreground">
            No activity yet. Toggle a consent or raise a request to get started.
          </p>
        ) : (
          <ul className="mt-3">
            {recentActivity.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 py-3 hairline-t text-[13.5px]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f2f1] text-primary">
                  <Clock className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.action}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    target {e.target}
                  </span>
                </span>
                <span className="tabular text-[12px] text-muted-foreground">
                  {relativeTime(new Date(e.ts))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </RefinedCard>

      <p className="px-1 pb-4 text-center text-[11px] text-muted-foreground">
        Signed in as {email}
      </p>
    </div>
  );
}

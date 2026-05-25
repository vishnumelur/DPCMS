import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice, noticeAck } from '@/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { acknowledgeNoticeAction } from '@/lib/actions/consent';

export const dynamic = 'force-dynamic';

export default async function MyNoticesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

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

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Privacy notices</h1>
          <p className="text-sm text-muted-foreground">
            Current and historical published notices. Acknowledge each one to record evidence in
            the audit chain.
          </p>
        </div>
        <Badge variant="default">Live · P1</Badge>
      </header>

      {notices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No notices have been published yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{n.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5">{n.slug}</code> · v{n.version} ·{' '}
                      {n.languageCode}
                    </p>
                  </div>
                  {ackedIds.has(n.id) ? (
                    <Badge variant="default">Acknowledged</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link href={`/me/notices/${n.slug}` as any} className="text-sm underline">
                  Read →
                </Link>
                {!ackedIds.has(n.id) ? (
                  <form action={acknowledgeNoticeAction} className="inline">
                    <input type="hidden" name="noticeId" value={n.id} />
                    <Button type="submit" size="sm">Acknowledge</Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

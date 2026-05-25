import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDsr, listDsrEvents, getSlaClock } from '@/modules/rights/service';
import { computeSlaState, type SlaState } from '@/modules/rights/sla';

export const dynamic = 'force-dynamic';

const SLA_VARIANT: Record<SlaState, 'default' | 'secondary' | 'destructive'> = {
  green: 'default',
  amber: 'secondary',
  red: 'destructive',
};

type PageProps = { params: Promise<{ requestId: string }> };

export default async function MyRequestDetailPage({ params }: PageProps) {
  const { requestId } = await params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const dsr = await getDsr(requestId);
  if (!dsr || dsr.principalUserId !== u.id) return notFound();

  const [events, clock] = await Promise.all([
    listDsrEvents(dsr.id),
    getSlaClock(dsr.id),
  ]);
  const sla: SlaState = clock
    ? computeSlaState({
        thresholdAmber: clock.thresholdAmber,
        thresholdRed: clock.thresholdRed,
      })
    : 'green';

  const now = new Date();
  const dueIn = clock
    ? Math.ceil((clock.thresholdRed.getTime() - now.getTime()) / 86_400_000)
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/me/requests' as any} className="text-xs underline">
            ← Back to requests
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{dsr.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {dsr.kind} · opened {dsr.createdAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <Badge variant="outline">{dsr.status}</Badge>
          <div>
            <Badge variant={SLA_VARIANT[sla]} className="text-[10px] uppercase">
              SLA · {sla}
            </Badge>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{dsr.details}</p>
          {dueIn !== null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Statutory deadline: {clock!.thresholdRed.toISOString().slice(0, 10)} ({dueIn} day(s) remaining)
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="rounded border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{e.createdAt.toISOString()}</span>
                    <span>{e.actorLabel}</span>
                  </div>
                  <p className="mt-1 font-medium">{e.eventKind}</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

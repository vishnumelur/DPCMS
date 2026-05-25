import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDsr, listDsrEvents, getSlaClock } from '@/modules/rights/service';
import { dsrFlow, DSR_EVENT_LABELS, type DsrEventName, type DsrState } from '@/modules/rights/flow';
import { computeSlaState, type SlaState } from '@/modules/rights/sla';
import { transitionDsrAction } from '@/lib/actions/dsr';

export const dynamic = 'force-dynamic';

const SLA_VARIANT: Record<SlaState, 'default' | 'secondary' | 'destructive'> = {
  green: 'default',
  amber: 'secondary',
  red: 'destructive',
};

type PageProps = { params: Promise<{ requestId: string }> };

export default async function AdminDsrDetailPage({ params }: PageProps) {
  const { requestId } = await params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const dsr = await getDsr(requestId);
  if (!dsr || dsr.orgId !== u.orgId) return notFound();

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

  // Available transitions from current state.
  const available = dsrFlow.transitions
    .filter((t) => t.from === (dsr.status as DsrState))
    .map((t) => t.on as DsrEventName);
  const uniqueAvailable = Array.from(new Set(available));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/admin/dsr' as any} className="text-xs underline">
            ← Back to queue
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{dsr.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {dsr.kind} · opened {dsr.createdAt.toISOString().slice(0, 10)} · principal{' '}
            <code className="font-mono text-xs">{dsr.principalUserId.slice(0, 8)}…</code>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueAvailable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No further transitions available — this request is in a terminal state.
            </p>
          ) : (
            <form action={transitionDsrAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="requestId" value={dsr.id} />
              <div className="space-y-1">
                <Label htmlFor="event">Next action</Label>
                <select
                  id="event"
                  name="event"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue={uniqueAvailable[0]}
                >
                  {uniqueAvailable.map((evt) => (
                    <option key={evt} value={evt}>
                      {DSR_EVENT_LABELS[evt]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="note">Note (optional)</Label>
                <Input id="note" name="note" placeholder="Reason / next step" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Transition</Button>
              </div>
            </form>
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
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    audit row_hash {e.rowHash.slice(0, 16)}…
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

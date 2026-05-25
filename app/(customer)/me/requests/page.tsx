import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, slaClock } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { listMyDsrs, DSR_KINDS } from '@/modules/rights/service';
import { computeSlaState, type SlaState } from '@/modules/rights/sla';
import { createDsrAction } from '@/lib/actions/dsr';

export const dynamic = 'force-dynamic';

const SLA_VARIANT: Record<SlaState, 'default' | 'secondary' | 'destructive'> = {
  green: 'default',
  amber: 'secondary',
  red: 'destructive',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  received: 'outline',
  identity_verified: 'secondary',
  in_review: 'secondary',
  info_requested: 'secondary',
  fulfilled: 'default',
  rejected: 'destructive',
  escalated: 'destructive',
};

export default async function MyRequestsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return <p className="text-sm text-muted-foreground">Sign in to view this page.</p>;
  }
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

  const dsrs = await listMyDsrs(u.orgId, u.id);
  const clocks = dsrs.length
    ? await db.select().from(slaClock).where(eq(slaClock.orgId, u.orgId))
    : [];
  const clockByRequest = new Map(clocks.map((c) => [c.requestId, c]));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">My data principal requests</h1>
          <p className="text-sm text-muted-foreground">
            Exercise your DPDP Act rights — access, correction, erasure, consent withdrawal,
            grievance redressal, nomination. SLA: 30 days (warning at 21 days).
          </p>
        </div>
        <Badge variant="default">Live · P2</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your requests ({dsrs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {dsrs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have not raised any requests yet. Use the form below to raise one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opened</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dsrs.map((d) => {
                  const clock = clockByRequest.get(d.id);
                  const sla: SlaState = clock
                    ? computeSlaState({
                        thresholdAmber: clock.thresholdAmber,
                        thresholdRed: clock.thresholdRed,
                      })
                    : 'green';
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">
                        {d.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs">{d.kind}</TableCell>
                      <TableCell className="text-sm">{d.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT[d.status] ?? 'outline'}
                          className="text-[10px]"
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={SLA_VARIANT[sla]} className="text-[10px] uppercase">
                          {sla}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Link href={`/me/requests/${d.id}` as any} className="text-xs underline">
                          Open →
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raise a new request</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDsrAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="kind" className="text-base">Right you are exercising</Label>
              <select
                id="kind"
                name="kind"
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm"
                defaultValue="access"
              >
                {DSR_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="subject" className="text-base">Subject (short)</Label>
              <Input
                id="subject"
                name="subject"
                required
                placeholder="Please send me a copy of my data"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="details" className="text-base">Details</Label>
              <textarea
                id="details"
                name="details"
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm"
                placeholder="Describe the request in your own words."
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" size="lg" className="h-11">Submit request</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

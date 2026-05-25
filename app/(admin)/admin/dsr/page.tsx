import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, slaClock } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { listOrgDsrs } from '@/modules/rights/service';
import { computeSlaState, type SlaState } from '@/modules/rights/sla';

export const dynamic = 'force-dynamic';

type SearchProps = {
  searchParams: Promise<{ status?: string; kind?: string }>;
};

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

const TERMINAL = new Set(['fulfilled', 'rejected']);

export default async function AdminDsrPage({ searchParams }: SearchProps) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const sp = await searchParams;
  const statusFilter = sp.status ?? 'all';
  const kindFilter = sp.kind ?? 'all';

  const all = await listOrgDsrs(u.orgId);
  const clocks = all.length
    ? await db.select().from(slaClock).where(eq(slaClock.orgId, u.orgId))
    : [];
  const clockByRequest = new Map(clocks.map((c) => [c.requestId, c]));

  const filtered = all.filter((d) => {
    if (kindFilter !== 'all' && d.kind !== kindFilter) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return !TERMINAL.has(d.status);
    if (statusFilter === 'closed') return TERMINAL.has(d.status);
    return d.status === statusFilter;
  });

  let open = 0;
  let received = 0;
  let fulfilled = 0;
  let breachRisk = 0;
  for (const d of all) {
    if (!TERMINAL.has(d.status)) open += 1;
    if (d.status === 'received') received += 1;
    if (d.status === 'fulfilled') fulfilled += 1;
    const clock = clockByRequest.get(d.id);
    const sla = clock
      ? computeSlaState({ thresholdAmber: clock.thresholdAmber, thresholdRed: clock.thresholdRed })
      : 'green';
    if (sla === 'red' && !TERMINAL.has(d.status)) breachRisk += 1;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M5 · Data principal rights</h1>
          <p className="text-sm text-muted-foreground">
            DSR queue across the org. SLA bands (green ≤ 21 d → amber → red ≥ 30 d) are
            recomputed live; no scheduler needed.
          </p>
        </div>
        <Badge variant="default">Live · P2</Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open" value={open} hint="not yet fulfilled / rejected" />
        <Stat label="Pending verification" value={received} hint="status = received" />
        <Stat label="Fulfilled" value={fulfilled} hint="terminal · success" />
        <Stat label="Breach-risk (red)" value={breachRisk} hint="≥ 30 days, still open" variant="destructive" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue ({filtered.length} of {all.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex flex-wrap gap-3 text-xs">
            <label className="space-y-1">
              <span className="block text-muted-foreground">Status</span>
              <select
                name="status"
                defaultValue={statusFilter}
                className="h-8 rounded border border-input bg-transparent px-2"
              >
                <option value="all">all</option>
                <option value="open">open</option>
                <option value="closed">closed</option>
                <option value="received">received</option>
                <option value="identity_verified">identity_verified</option>
                <option value="in_review">in_review</option>
                <option value="info_requested">info_requested</option>
                <option value="fulfilled">fulfilled</option>
                <option value="rejected">rejected</option>
                <option value="escalated">escalated</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-muted-foreground">Kind</span>
              <select
                name="kind"
                defaultValue={kindFilter}
                className="h-8 rounded border border-input bg-transparent px-2"
              >
                <option value="all">all</option>
                <option value="access">access</option>
                <option value="correction">correction</option>
                <option value="erasure">erasure</option>
                <option value="revoke_consent">revoke_consent</option>
                <option value="grievance">grievance</option>
                <option value="nominate">nominate</option>
              </select>
            </label>
            <button
              type="submit"
              className="self-end rounded border border-input bg-background px-3 py-1 text-xs"
            >
              Apply filters
            </button>
          </form>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests match the filter.</p>
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
                {filtered.map((d) => {
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
                        <Link href={`/admin/dsr/${d.id}` as any} className="text-xs underline">
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
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  variant,
}: {
  label: string;
  value: number;
  hint: string;
  variant?: 'destructive';
}) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-3xl font-semibold ${variant === 'destructive' ? 'text-destructive' : ''}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

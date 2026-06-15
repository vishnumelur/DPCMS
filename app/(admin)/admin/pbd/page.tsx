import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, auditLog } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
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
import { raisePbdRequestAction } from '@/lib/actions/pbd';

export const dynamic = 'force-dynamic';

type PbdStatus = 'RAISED' | 'UNDER_REVIEW' | 'APPROVED' | 'MONITORED';

type PbdRow = {
  ref: string;
  title: string;
  area: string;
  status: PbdStatus;
  raisedBy: string;
  raisedAt: string;
};

const STATUS_META: Record<
  PbdStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  RAISED: { label: 'Raised', variant: 'outline' },
  UNDER_REVIEW: { label: 'Under review', variant: 'secondary' },
  APPROVED: { label: 'Approved', variant: 'default' },
  MONITORED: { label: 'Approved · monitored', variant: 'default' },
};

// Representative register so the lifecycle (raise → evaluate → manage → monitor)
// is always visible. Live requests raised through the form are merged on top.
const SAMPLE_PBD: PbdRow[] = [
  {
    ref: 'PBD-2026-014',
    title: 'New UPI autopay mandate flow',
    area: 'Digital Banking',
    status: 'MONITORED',
    raisedBy: 'product@kscb',
    raisedAt: '2026-05-02',
  },
  {
    ref: 'PBD-2026-021',
    title: 'WhatsApp statement delivery',
    area: 'Customer Comms',
    status: 'APPROVED',
    raisedBy: 'cx@kscb',
    raisedAt: '2026-05-18',
  },
  {
    ref: 'PBD-2026-027',
    title: 'Branch tablet KYC capture',
    area: 'Branch Operations',
    status: 'UNDER_REVIEW',
    raisedBy: 'ops@kscb',
    raisedAt: '2026-06-01',
  },
];

export default async function AdminPbdPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const raised = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.orgId, u.orgId), eq(auditLog.stream, 'pbd')))
    .orderBy(desc(auditLog.ts));

  const liveRows: PbdRow[] = raised.map((r) => {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    return {
      ref: `PBD-${String(r.seq).padStart(4, '0')}`,
      title: String(p.title ?? r.target),
      area: String(p.area ?? 'General'),
      status: 'RAISED',
      raisedBy: r.actorLabel,
      raisedAt: r.ts.toISOString().slice(0, 10),
    };
  });

  const rows = [...liveRows, ...SAMPLE_PBD];
  const open = rows.filter((r) => r.status === 'RAISED' || r.status === 'UNDER_REVIEW').length;
  const approved = rows.filter((r) => r.status === 'APPROVED').length;
  const monitored = rows.filter((r) => r.status === 'MONITORED').length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Privacy by Design</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end mechanism for internal teams to raise a Privacy by Design (PbD) request when
            an application or process change touches personal data. Each request is evaluated,
            managed and monitored by the privacy team — and hash-chained in the audit log.
          </p>
        </div>
        <Badge variant="default">Live · §10</Badge>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Open (raise / review)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold tabular-nums">{open}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold tabular-nums">{approved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              Approved · monitored
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold tabular-nums">{monitored}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raise a Privacy by Design request</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={raisePbdRequestAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Change / feature</Label>
              <Input id="title" name="title" placeholder="e.g. New mobile onboarding journey" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area">Business area</Label>
              <Input id="area" name="area" placeholder="e.g. Digital Banking" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">What personal data does it affect?</Label>
              <Input
                id="description"
                name="description"
                placeholder="Describe the personal-data impact to be evaluated"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Raise PbD request</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PbD register</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Change / feature</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Raised by</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <TableRow key={r.ref}>
                    <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground">{r.area}</TableCell>
                    <TableCell className="text-muted-foreground">{r.raisedBy}</TableCell>
                    <TableCell className="text-muted-foreground">{r.raisedAt}</TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

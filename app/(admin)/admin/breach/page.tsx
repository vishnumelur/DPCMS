import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
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
import { listIncidents, BREACH_SEVERITIES } from '@/modules/breach/service';
import { declareBreachAction } from '@/lib/actions/breach';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  detected: 'destructive',
  assessing: 'secondary',
  contained: 'secondary',
  reported_dpb: 'default',
  closed: 'outline',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

export default async function AdminBreachPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const incidents = await listIncidents(u.orgId);

  let detected = 0;
  let assessing = 0;
  let contained = 0;
  let reported = 0;
  for (const i of incidents) {
    if (i.status === 'detected') detected += 1;
    if (i.status === 'assessing') assessing += 1;
    if (i.status === 'contained') contained += 1;
    if (i.status === 'reported_dpb') reported += 1;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M9 · Data breach management</h1>
          <p className="text-sm text-muted-foreground">
            Incident lifecycle — detect, assess, contain, report to the Data Protection Board,
            close. 72-hour reporting deadline is auto-computed from detection time.
          </p>
        </div>
        <Badge variant="default">Live · P2</Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Detected" value={detected} hint="new — needs triage" variant="destructive" />
        <Stat label="Assessing" value={assessing} hint="severity & scope under review" />
        <Stat label="Contained" value={contained} hint="immediate risk stopped" />
        <Stat label="Reported to DPB" value={reported} hint="notification recorded" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incidents ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No incidents yet. Declare one below to start the lifecycle.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Detected</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">
                      {i.detectedAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </TableCell>
                    <TableCell className="text-sm">{i.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={SEVERITY_VARIANT[i.severity] ?? 'outline'}
                        className="text-[10px] uppercase"
                      >
                        {i.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[i.status] ?? 'outline'}
                        className="text-[10px]"
                      >
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {i.reportingDeadlineAt
                        ? i.reportingDeadlineAt.toISOString().slice(0, 16).replace('T', ' ')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Link href={`/admin/breach/${i.id}` as any} className="text-xs underline">
                        Open →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Declare a new incident</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={declareBreachAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Unauthorised access to KYC bucket" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="What happened, when did you find out, who reported it."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="severity">Severity</Label>
              <select
                id="severity"
                name="severity"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue="medium"
              >
                {BREACH_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="estimatedAffectedCount">Estimated affected count</Label>
              <Input
                id="estimatedAffectedCount"
                name="estimatedAffectedCount"
                type="number"
                min={0}
                defaultValue={0}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
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
              <Button type="submit">Declare incident</Button>
            </div>
          </form>
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

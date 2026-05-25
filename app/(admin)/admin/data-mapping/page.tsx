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
import { listActivitiesWithPurpose } from '@/modules/ropa/service';
import { listPurposes } from '@/modules/consent/purposes';
import { createActivityAction } from '@/lib/actions/ropa';
import { LEGAL_BASES } from '@/modules/assessment/templates';

export const dynamic = 'force-dynamic';

export default async function AdminDataMappingPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const [rows, purposes] = await Promise.all([
    listActivitiesWithPurpose(u.orgId),
    listPurposes(u.orgId),
  ]);

  const total = rows.length;
  const crossBorder = rows.filter((r) => r.activity.crossBorder).length;
  const noOwner = rows.filter((r) => !r.activity.ownerUserId).length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M3 · Data mapping (RoPA)</h1>
          <p className="text-sm text-muted-foreground">
            Records of Processing Activities — purposes, legal bases, retention, data categories
            and systems of record. Source of truth for the PIA and DPIA modules.
          </p>
        </div>
        <Badge variant="default">Live · P3</Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total activities" value={total} hint="rows in the RoPA register" />
        <Stat
          label="Cross-border"
          value={crossBorder}
          hint="transfers outside India"
          variant={crossBorder ? 'destructive' : undefined}
        />
        <Stat
          label="No owner assigned"
          value={noOwner}
          hint="needs an accountable role"
          variant={noOwner ? 'destructive' : undefined}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Processing activities ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activities yet. Add one below to start the RoPA register.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Legal basis</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Cross-border</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.activity.id}>
                    <TableCell className="text-sm font-medium">{r.activity.name}</TableCell>
                    <TableCell className="text-xs">
                      {r.purposeCode ? (
                        <span className="font-mono">{r.purposeCode}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.activity.legalBasis}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.activity.retentionPeriodMonths} mo
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.activity.systemOfRecord || '—'}
                    </TableCell>
                    <TableCell>
                      {r.activity.crossBorder ? (
                        <Badge variant="destructive" className="text-[10px]">
                          yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          no
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Link href={`/admin/data-mapping/${r.activity.id}` as any} className="text-xs underline">
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
          <CardTitle className="text-base">Add a processing activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createActivityAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Customer KYC processing" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="What this processing does — purpose, business outcome, scope."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="purposeId">Linked purpose (optional)</Label>
              <select
                id="purposeId"
                name="purposeId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue=""
              >
                <option value="">— none —</option>
                {purposes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="legalBasis">Legal basis</Label>
              <select
                id="legalBasis"
                name="legalBasis"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue="consent"
              >
                {LEGAL_BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="dataCategories">Data categories (comma-separated)</Label>
              <Input
                id="dataCategories"
                name="dataCategories"
                placeholder="identity, contact, financial"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="dataSubjects">Data subjects (comma-separated)</Label>
              <Input
                id="dataSubjects"
                name="dataSubjects"
                placeholder="customer, employee, vendor"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="recipients">Recipients (comma-separated)</Label>
              <Input
                id="recipients"
                name="recipients"
                placeholder="NPCI, UIDAI, external_esp"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="systemOfRecord">System of record</Label>
              <Input id="systemOfRecord" name="systemOfRecord" placeholder="Finacle / CRM / HRMS" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="retentionPeriodMonths">Retention (months)</Label>
              <Input
                id="retentionPeriodMonths"
                name="retentionPeriodMonths"
                type="number"
                min={0}
                defaultValue={0}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="retentionRationale">Retention rationale</Label>
              <Input
                id="retentionRationale"
                name="retentionRationale"
                placeholder="RBI KYC Master Direction §7"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="crossBorder"
                name="crossBorder"
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="crossBorder">Cross-border transfer involved</Label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Add activity</Button>
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
        <p
          className={`text-3xl font-semibold ${
            variant === 'destructive' ? 'text-destructive' : ''
          }`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

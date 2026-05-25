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
import { listPurposes, getArtefactCountsByPurpose } from '@/modules/consent/purposes';
import { createPurposeAction } from '@/lib/actions/consent';

export const dynamic = 'force-dynamic';

export default async function AdminConsentsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return <p className="text-sm text-muted-foreground">Sign in to view this page.</p>;
  }
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;
  const orgId = u.orgId;

  const [purposes, counts] = await Promise.all([
    listPurposes(orgId),
    getArtefactCountsByPurpose(orgId),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M1 · Consent management</h1>
          <p className="text-sm text-muted-foreground">
            Purpose-specific consents under the DPDP Act 2023. Every grant/withdrawal is signed
            (RS256 JWS) and chained into the immutable audit log.
          </p>
        </div>
        <Badge variant="default">Live · P1</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purposes ({purposes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {purposes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No purposes yet. Add one below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Lawful basis</TableHead>
                  <TableHead>Data categories</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Withdrawn</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purposes.map((p) => {
                  const c = counts.get(p.id) ?? { granted: 0, withdrawn: 0, renewed: 0 };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{p.lawfulBasis}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.dataCategories.slice(0, 3).join(', ')}
                        {p.dataCategories.length > 3 ? ` +${p.dataCategories.length - 3}` : ''}
                      </TableCell>
                      <TableCell>{c.granted}</TableCell>
                      <TableCell>{c.withdrawn}</TableCell>
                      <TableCell>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Link href={`/admin/consents/${p.id}` as any} className="text-xs underline">
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
          <CardTitle className="text-base">Add a new purpose</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPurposeAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="code">Code (uppercase, snake_case)</Label>
              <Input id="code" name="code" required placeholder="LOAN_APPLICATION" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" required placeholder="Loan application processing" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="What you'll do with the data" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lawfulBasis">Lawful basis</Label>
              <Input
                id="lawfulBasis"
                name="lawfulBasis"
                defaultValue="consent"
                placeholder="consent | contract | legal_obligation | …"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dataCategories">Data categories (comma-separated)</Label>
              <Input id="dataCategories" name="dataCategories" placeholder="identity, contact, address" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create purpose + v1 template</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

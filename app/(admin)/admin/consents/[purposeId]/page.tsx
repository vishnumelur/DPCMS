import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, consentArtefact } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
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
import { getPurposeById } from '@/modules/consent/purposes';
import { getPurposePreferences } from '@/modules/consent/queries';

export const dynamic = 'force-dynamic';

export default async function AdminPurposeDetailPage({
  params,
}: {
  params: Promise<{ purposeId: string }>;
}) {
  const { purposeId } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;
  const orgId = u.orgId;

  const p = await getPurposeById(orgId, purposeId);
  if (!p) notFound();

  const prefs = await getPurposePreferences(orgId, purposeId);
  const artefacts = await db
    .select()
    .from(consentArtefact)
    .where(and(eq(consentArtefact.orgId, orgId), eq(consentArtefact.purposeId, purposeId)))
    .orderBy(desc(consentArtefact.createdAt))
    .limit(20);

  // user labels
  const principalIds = Array.from(new Set([
    ...prefs.map((x) => x.principalUserId),
    ...artefacts.map((a) => a.principalUserId),
  ]));
  const users = principalIds.length
    ? await db.select().from(user)
    : [];
  const label = (id: string) => users.find((x) => x.id === id)?.email ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/admin/consents" className="text-xs text-muted-foreground underline">
          ← All purposes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.code}</code> ·{' '}
              <Badge variant="outline" className="text-[10px]">{p.lawfulBasis}</Badge>
            </p>
            {p.description ? <p className="text-sm">{p.description}</p> : null}
          </div>
          <Badge variant="default">Live · P1</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer preferences ({prefs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {prefs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No customer has interacted with this purpose yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Principal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Artefact</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prefs.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>{label(pr.principalUserId)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {pr.status === 'active' ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                        ) : pr.status === 'withdrawn' ? (
                          <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                        <Badge variant={pr.status === 'active' ? 'default' : 'secondary'}>
                          {pr.status}
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {pr.currentArtefactId.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pr.updatedAt.toISOString()}
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
          <CardTitle className="text-base">Recent artefacts ({artefacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {artefacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No artefacts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Body hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artefacts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.createdAt.toISOString()}</TableCell>
                    <TableCell>{label(a.principalUserId)}</TableCell>
                    <TableCell>
                      <Badge variant={a.kind === 'granted' ? 'default' : a.kind === 'withdrawn' ? 'destructive' : 'secondary'}>
                        {a.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {a.bodyHash.slice(0, 16)}…
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

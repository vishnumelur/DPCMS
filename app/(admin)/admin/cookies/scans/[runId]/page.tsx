import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, cookieCategory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { getScanRun, listScanFindings } from '@/modules/cookies/scanner';
import { promoteScanFindingAction } from '@/lib/actions/cookies';

export const dynamic = 'force-dynamic';

const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  essential: 'default',
  functional: 'secondary',
  analytics: 'outline',
  marketing: 'destructive',
};

export default async function AdminCookieScanDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

  const run = await getScanRun(u.orgId, runId);
  if (!run) notFound();

  const [findings, existingCategories] = await Promise.all([
    listScanFindings(run.id),
    db.select().from(cookieCategory).where(eq(cookieCategory.orgId, u.orgId)),
  ]);
  const haveCategory = new Set(existingCategories.map((c) => c.key));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/admin/cookies" className="text-xs text-muted-foreground underline">
          ← Back to cookies
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Cookie scan results</h1>
            <p className="text-sm text-muted-foreground">
              Target:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{run.targetUrl}</code>
              {' · '}
              Scanned at {run.scannedAt.toISOString().slice(0, 19).replace('T', ' ')}
            </p>
          </div>
          <div className="text-right text-xs">
            <Badge variant={run.errorMessage ? 'destructive' : 'default'}>
              HTTP {run.statusCode ?? '—'}
            </Badge>
            <div className="mt-1 text-muted-foreground">{run.foundCount} cookies</div>
          </div>
        </div>
      </header>

      {run.errorMessage ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-sm">
            Scan failed: <code>{run.errorMessage}</code>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Findings ({findings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cookies were set on the response (the site may set them only after a login or via
              JavaScript — this scanner is single-request only).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cookie</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Suggested</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.cookieName}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {f.domain ?? '—'}
                      {f.path ? <span className="ml-1">({f.path})</span> : null}
                    </TableCell>
                    <TableCell className="text-[10px]">
                      {f.secure ? <Badge variant="outline" className="mr-1 text-[10px]">Secure</Badge> : null}
                      {f.httpOnly ? <Badge variant="outline" className="mr-1 text-[10px]">HttpOnly</Badge> : null}
                      {f.sameSite ? (
                        <Badge variant="outline" className="text-[10px]">SameSite={f.sameSite}</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={CATEGORY_VARIANT[f.suggestedCategoryKey] ?? 'outline'}
                        className="text-[10px] uppercase"
                      >
                        {f.suggestedCategoryKey}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.suggestedRationale}
                    </TableCell>
                    <TableCell>
                      {haveCategory.has(f.suggestedCategoryKey) ? (
                        <span className="text-[10px] text-muted-foreground">already a category</span>
                      ) : (
                        <form action={promoteScanFindingAction} className="inline">
                          <input type="hidden" name="findingId" value={f.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Add as category
                          </Button>
                        </form>
                      )}
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

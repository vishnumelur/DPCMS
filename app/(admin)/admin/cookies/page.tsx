import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, cookieCategory, cookieConsentRecord } from '@/db/schema';
import { desc, eq, count } from 'drizzle-orm';
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
import { createCookieCategoryAction } from '@/lib/actions/consent';
import { runCookieScanAction } from '@/lib/actions/cookies';
import { listRecentScans } from '@/modules/cookies/scanner';

export const dynamic = 'force-dynamic';

export default async function AdminCookiesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;
  const orgId = u.orgId;

  const cats = await db
    .select()
    .from(cookieCategory)
    .where(eq(cookieCategory.orgId, orgId))
    .orderBy(cookieCategory.key);

  const totalRecords = await db
    .select({ n: count() })
    .from(cookieConsentRecord)
    .where(eq(cookieConsentRecord.orgId, orgId));

  const recent = await db
    .select()
    .from(cookieConsentRecord)
    .where(eq(cookieConsentRecord.orgId, orgId))
    .orderBy(desc(cookieConsentRecord.createdAt))
    .limit(10);

  const recentScans = await listRecentScans(orgId, 5);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M2 · Cookie consent</h1>
          <p className="text-sm text-muted-foreground">
            Manage cookie categories shown on the public site banner. The banner POSTs each decision
            to <code>/api/cookies/consent</code> which writes an audited consent record.
          </p>
        </div>
        <Badge variant="default">Live · P1</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories ({cats.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Essential</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cats.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.key}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    {c.isEssential ? (
                      <Badge variant="default" className="text-[10px]">Essential</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan a URL for cookies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Paste any HTTPS URL — DPCMS fetches it server-side (single request, no crawl), parses
            the <code>Set-Cookie</code> headers and proposes categories using a pattern-based
            heuristic (Google Analytics, Meta Pixel, Microsoft, etc.). Max 30 cookies / 10 s.
          </p>
          <form action={runCookieScanAction} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="targetUrl">Target URL</Label>
              <Input
                id="targetUrl"
                name="targetUrl"
                required
                placeholder="https://www.example.com"
                defaultValue="https://www.example.com"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Run scan</Button>
            </div>
          </form>
          {recentScans.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">Recent scans</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cookies</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentScans.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        {s.scannedAt.toISOString().slice(0, 19).replace('T', ' ')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <span title={s.targetUrl}>{s.targetUrl.slice(0, 40)}{s.targetUrl.length > 40 ? '…' : ''}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.errorMessage ? (
                          <Badge variant="destructive" className="text-[10px]">{s.errorMessage.slice(0, 24)}</Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">{s.statusCode ?? '—'}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{s.foundCount}</TableCell>
                      <TableCell>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Link href={`/admin/cookies/scans/${s.id}` as any} className="text-xs underline">
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a category</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCookieCategoryAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="key">Key (lowercase)</Label>
              <Input id="key" name="key" required placeholder="personalisation" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Personalisation" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" id="isEssential" name="isEssential" />
              <Label htmlFor="isEssential" className="inline">
                Essential (always on, user cannot decline)
              </Label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Add category</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent consent records ({totalRecords[0]?.n ?? 0} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cookie decisions recorded yet. Visit the public landing page to trigger the banner.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>UA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.createdAt.toISOString()}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sessionId.slice(0, 10)}…</TableCell>
                    <TableCell className="text-xs">{r.categoriesAccepted.join(', ')}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-[10px] text-muted-foreground">
                      {r.userAgent ?? '—'}
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

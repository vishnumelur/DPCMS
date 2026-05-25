import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
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
import { createNoticeAction } from '@/lib/actions/consent';

export const dynamic = 'force-dynamic';

export default async function AdminNoticesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;
  const orgId = u.orgId;

  const notices = await db
    .select()
    .from(notice)
    .where(eq(notice.orgId, orgId))
    .orderBy(desc(notice.createdAt));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M8 · Privacy notices</h1>
          <p className="text-sm text-muted-foreground">
            Author, version and publish privacy notices. Each (slug, version, language) is uniquely
            addressable; older versions stay queryable for audit.
          </p>
        </div>
        <Badge variant="default">Live · P1</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notices ({notices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices yet. Create one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Lang</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.slug}</TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell>{n.languageCode}</TableCell>
                    <TableCell>v{n.version}</TableCell>
                    <TableCell>
                      {n.publishedAt ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Link href={`/admin/notices/${n.id}` as any} className="text-xs underline">
                        View →
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
          <CardTitle className="text-base">Create a new notice version</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createNoticeAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" required placeholder="general" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="General Privacy Notice" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bodyMarkdown">Body (Markdown)</Label>
              <textarea
                id="bodyMarkdown"
                name="bodyMarkdown"
                required
                rows={8}
                className="w-full rounded border bg-transparent px-3 py-2 text-sm"
                placeholder={'# Title\n\n## Section\n\nText…'}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="publish" name="publish" defaultChecked />
              <Label htmlFor="publish" className="inline">Publish immediately</Label>
            </div>
            <Button type="submit">Save version</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

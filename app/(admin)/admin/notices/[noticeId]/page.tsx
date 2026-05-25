import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function AdminNoticeDetailPage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;
  const orgId = u.orgId;

  const nRows = await db
    .select()
    .from(notice)
    .where(and(eq(notice.orgId, orgId), eq(notice.id, noticeId)))
    .limit(1);
  const n = nRows[0];
  if (!n) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/admin/notices" className="text-xs text-muted-foreground underline">
          ← All notices
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{n.title}</h1>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{n.slug}</code> · v{n.version} ·{' '}
              {n.languageCode}
            </p>
          </div>
          {n.publishedAt ? (
            <Badge variant="default">Published</Badge>
          ) : (
            <Badge variant="outline">Draft</Badge>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/30 p-4 font-mono text-xs leading-relaxed">
            {n.bodyMarkdown}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

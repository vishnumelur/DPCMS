import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice } from '@/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function MyNoticeViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

  // Latest published version for this slug, English.
  const nRows = await db
    .select()
    .from(notice)
    .where(
      and(
        eq(notice.orgId, u.orgId),
        eq(notice.slug, slug),
        eq(notice.languageCode, 'en'),
        isNotNull(notice.publishedAt),
      ),
    )
    .orderBy(desc(notice.version))
    .limit(1);
  const n = nRows[0];
  if (!n) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/me/notices" className="text-xs text-muted-foreground underline">
          ← All notices
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{n.title}</h1>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{n.slug}</code> · v{n.version}
            </p>
          </div>
          <Badge variant="default">Published</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notice body</CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-sm max-w-none whitespace-pre-wrap">
            {n.bodyMarkdown}
          </article>
        </CardContent>
      </Card>
    </div>
  );
}

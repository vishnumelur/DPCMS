import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice } from '@/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from '@/i18n/routing';
import { getReviewedTranslation } from '@/modules/consent/notice-translate';

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

  // Latest published version for this slug, English (source-of-truth body).
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

  // Resolve the current locale from the cookie. Default to English when the
  // cookie is missing or set to a value we don't recognise.
  const store = await cookies();
  const cookieLocale = store.get('locale')?.value ?? '';
  const localeIsValid = (LOCALES as readonly string[]).includes(cookieLocale);
  const locale: Locale = localeIsValid ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  let renderedBody = n.bodyMarkdown;
  let translated: { source: 'reviewed' } | null = null;
  let pendingTranslation = false;
  if (locale !== 'en') {
    const t = await getReviewedTranslation(n.id, locale);
    if (t) {
      renderedBody = t.bodyMarkdown;
      translated = { source: 'reviewed' };
    } else {
      pendingTranslation = true;
    }
  }

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
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{n.slug}</code> · v{n.version}{' '}
              · {translated ? `Translated → ${LOCALE_LABELS[locale]}` : `English`}
            </p>
          </div>
          <Badge variant="default">Published</Badge>
        </div>
      </header>

      {pendingTranslation ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 text-xs">
            Showing English original — translation into{' '}
            <strong>{LOCALE_LABELS[locale]}</strong> is not yet reviewed by the DPO. Switch language
            from the top bar to view another locale.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notice body</CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-sm max-w-none whitespace-pre-wrap">
            {renderedBody}
          </article>
        </CardContent>
      </Card>
    </div>
  );
}

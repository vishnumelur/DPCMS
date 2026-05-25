import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice, noticeTranslation } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/routing';
import {
  translateNoticeAction,
  approveNoticeTranslationAction,
} from '@/lib/actions/consent';

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

  const translations = await db
    .select()
    .from(noticeTranslation)
    .where(eq(noticeTranslation.noticeId, noticeId));

  const translatedSet = new Set(translations.map((t) => t.languageCode));
  // English is the source; never a target.
  const targetLocales: Locale[] = LOCALES.filter((l) => l !== 'en') as Locale[];
  const pendingLocales = targetLocales.filter((l) => !translatedSet.has(l));
  const reviewedCount = translations.filter((t) => t.reviewed).length;

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
          <CardTitle className="text-base">Original (English)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/30 p-4 font-mono text-xs leading-relaxed">
            {n.bodyMarkdown}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Translations ({translations.length} of {targetLocales.length}) ·{' '}
            <span className="text-xs font-normal text-muted-foreground">
              {reviewedCount} reviewed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {translations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No translations yet. Generate them below — Gemini will produce drafts in every
              Schedule-8 language for DPO review before customers see them.
            </p>
          ) : (
            <ul className="space-y-2">
              {translations
                .slice()
                .sort((a, b) => a.languageCode.localeCompare(b.languageCode))
                .map((t) => {
                  const label = LOCALE_LABELS[t.languageCode as Locale] ?? t.languageCode;
                  return (
                    <li key={t.id} className="rounded border bg-card">
                      <details className="group">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                              {t.languageCode}
                            </Badge>
                            <span>{label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              · source: {t.source}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            {t.reviewed ? (
                              <Badge variant="default" className="text-[10px]">
                                Reviewed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Pending
                              </Badge>
                            )}
                          </span>
                        </summary>
                        <div className="space-y-3 border-t px-3 py-3">
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
                            {t.bodyMarkdown}
                          </pre>
                          {!t.reviewed && (
                            <form action={approveNoticeTranslationAction} className="inline">
                              <input type="hidden" name="translationId" value={t.id} />
                              <Button type="submit" size="sm">
                                Approve translation
                              </Button>
                            </form>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate translations</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLocales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All {targetLocales.length} Schedule-8 target languages already have translation rows.
              Use <em>Approve</em> above to gate publishing.
            </p>
          ) : (
            <form action={translateNoticeAction} className="space-y-3">
              <input type="hidden" name="noticeId" value={n.id} />
              <p className="text-xs text-muted-foreground">
                Submit with the box left empty to translate into all {pendingLocales.length} pending
                Schedule-8 locales. Pre-select fewer to scope the run.
              </p>
              <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto rounded border p-3 sm:grid-cols-3">
                {pendingLocales.map((l) => (
                  <label key={l} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="localeCheck" value={l} />
                    <span className="font-mono uppercase">{l}</span>
                    <span className="text-muted-foreground">{LOCALE_LABELS[l]}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tick any subset above to scope the run, or leave all unticked to translate every
                pending locale.
              </p>
              <Button type="submit">Generate via Gemini</Button>
              <p className="text-[10px] text-muted-foreground">
                Runs through <code>lib/ai/gateway.ts</code> with PII redaction. If
                <code className="mx-1">AI_GATEWAY_API_KEY</code>
                is unset, a deterministic placeholder is written so the demo always works.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

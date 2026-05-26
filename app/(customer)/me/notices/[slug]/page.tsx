import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, notice } from '@/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import {
  RefinedCard,
  Eyebrow,
  StatusPill,
} from '@/components/ui-refined/refined';
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from '@/i18n/routing';
import { getReviewedTranslation } from '@/modules/consent/notice-translate';
import { ReadAloudButton } from '@/components/notice/read-aloud-button';
import { ChevronLeft, CheckCircle2, Languages } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MyNoticeViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">Sign in to view this notice.</p>
      </RefinedCard>
    );
  }
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) {
    return (
      <RefinedCard className="p-8 text-center">
        <p className="text-[14px] text-muted-foreground">No organisation linked.</p>
      </RefinedCard>
    );
  }

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

  const store = await cookies();
  const cookieLocale = store.get('locale')?.value ?? '';
  const localeIsValid = (LOCALES as readonly string[]).includes(cookieLocale);
  const locale: Locale = localeIsValid ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  let renderedBody = n.bodyMarkdown;
  let translated = false;
  let pendingTranslation = false;
  if (locale !== 'en') {
    const t = await getReviewedTranslation(n.id, locale);
    if (t) {
      renderedBody = t.bodyMarkdown;
      translated = true;
    } else {
      pendingTranslation = true;
    }
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <Link
          href="/me/notices"
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          All notices
        </Link>
      </div>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0 space-y-2">
          <Eyebrow>Privacy notice</Eyebrow>
          <h1 className="break-words text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] [text-wrap:balance] sm:text-[30px] sm:leading-[1.1]">
            {n.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
            <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">
              {n.slug}
            </code>
            <span>v{n.version}</span>
            <span className="opacity-50">·</span>
            <span>
              {translated ? `Translated → ${LOCALE_LABELS[locale]}` : 'English'}
            </span>
            {n.publishedAt ? (
              <>
                <span className="opacity-50">·</span>
                <span className="tabular">
                  Published{' '}
                  {new Date(n.publishedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <StatusPill tone="ok">
            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
            Published
          </StatusPill>
          <ReadAloudButton
            text={`${n.title}. ${renderedBody}`}
            locale={translated ? locale : 'en'}
          />
        </div>
      </header>

      {pendingTranslation ? (
        <RefinedCard className="p-5">
          <div className="flex gap-3">
            <Languages
              className="mt-0.5 h-5 w-5 shrink-0 text-[#a85d00]"
              strokeWidth={1.5}
            />
            <p className="min-w-0 break-words text-[13.5px] leading-snug">
              Showing the English original — the{' '}
              <strong>{LOCALE_LABELS[locale]}</strong> translation has not yet been reviewed by
              the DPO. Switch language from the top bar to view another locale.
            </p>
          </div>
        </RefinedCard>
      ) : null}

      {/* Body */}
      <RefinedCard className="p-6 sm:p-8">
        <article
          lang={translated ? locale : 'en'}
          className="prose prose-sm max-w-none break-words text-[14.5px] leading-[1.65] [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:tracking-[-0.015em] [&_p]:my-3 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] sm:text-[15px]"
        >
          <p className="whitespace-pre-wrap">{renderedBody}</p>
        </article>
      </RefinedCard>
    </div>
  );
}

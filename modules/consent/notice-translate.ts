import { db } from '@/db/client';
import { notice, noticeTranslation } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { aiGenerateText } from '@/lib/ai/gateway';
import { env } from '@/lib/env';
import { LOCALE_LABELS, type Locale } from '@/i18n/routing';

export type TranslateResult = {
  created: number;
  skipped: number;
  source: 'ai' | 'fallback';
  perLocale: Array<{ locale: Locale; status: 'created' | 'skipped'; reason?: string }>;
};

/**
 * For each requested locale that doesn't already have a translation row for
 * this notice, generate one via Gemini (or the deterministic fallback when no
 * API key is configured) and persist it as `reviewed=false`. Idempotent unless
 * `force=true` is passed.
 */
export async function translateNoticeViaGemini(
  orgId: string,
  noticeId: string,
  targetLocales: ReadonlyArray<Locale>,
  opts: { force?: boolean } = {},
): Promise<TranslateResult> {
  const nRows = await db
    .select()
    .from(notice)
    .where(and(eq(notice.orgId, orgId), eq(notice.id, noticeId)))
    .limit(1);
  const n = nRows[0];
  if (!n) throw new Error('notice_not_found');

  const existing = await db
    .select({ languageCode: noticeTranslation.languageCode })
    .from(noticeTranslation)
    .where(eq(noticeTranslation.noticeId, noticeId));
  const existingLocales = new Set(existing.map((r) => r.languageCode));

  const useFallback = !env.AI_GATEWAY_API_KEY;
  const source: 'ai' | 'fallback' = useFallback ? 'fallback' : 'ai';
  const perLocale: TranslateResult['perLocale'] = [];
  let created = 0;
  let skipped = 0;

  for (const locale of targetLocales) {
    // Translating into English is a no-op.
    if (locale === 'en') {
      perLocale.push({ locale, status: 'skipped', reason: 'source_language' });
      skipped++;
      continue;
    }
    if (existingLocales.has(locale) && !opts.force) {
      perLocale.push({ locale, status: 'skipped', reason: 'already_exists' });
      skipped++;
      continue;
    }

    let translated: string;
    if (useFallback) {
      translated = deterministicFallback(locale, n.bodyMarkdown);
    } else {
      try {
        translated = await aiGenerateText(
          { orgId, purpose: 'notice_translate' },
          [
            {
              role: 'user',
              content: buildPrompt(locale, n.bodyMarkdown),
            },
          ],
        );
        translated = translated.trim();
        if (!translated) translated = deterministicFallback(locale, n.bodyMarkdown);
      } catch {
        translated = deterministicFallback(locale, n.bodyMarkdown);
      }
    }

    if (opts.force && existingLocales.has(locale)) {
      await db
        .update(noticeTranslation)
        .set({ bodyMarkdown: translated, source, reviewed: false, reviewedAt: null })
        .where(
          and(
            eq(noticeTranslation.noticeId, noticeId),
            eq(noticeTranslation.languageCode, locale),
          ),
        );
    } else {
      await db.insert(noticeTranslation).values({
        orgId,
        noticeId,
        languageCode: locale,
        bodyMarkdown: translated,
        source,
        reviewed: false,
      });
    }
    perLocale.push({ locale, status: 'created' });
    created++;
  }

  return { created, skipped, source, perLocale };
}

function buildPrompt(locale: Locale, body: string): string {
  const label = LOCALE_LABELS[locale];
  return [
    `Translate the following privacy notice text from English into ${label}.`,
    'Preserve markdown headings, lists and links. Do not add commentary.',
    'Return ONLY the translated text, no preamble.',
    '',
    '--- BEGIN NOTICE ---',
    body,
    '--- END NOTICE ---',
  ].join('\n');
}

function deterministicFallback(locale: Locale, body: string): string {
  // No API key — emit a clearly-marked placeholder so the surface still works
  // for demos. Includes the locale label so reviewers see something Indic.
  const label = LOCALE_LABELS[locale];
  const head = body.slice(0, 280);
  return [
    `> _Auto-translation placeholder (deterministic fallback — no Gemini key configured)._`,
    '',
    `**[${locale.toUpperCase()} — ${label}]**`,
    '',
    head,
    body.length > 280 ? `…\n\n_(${body.length - 280} chars trimmed in placeholder)_` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Lookup the latest reviewed translation for a (notice, locale). */
export async function getReviewedTranslation(noticeId: string, locale: Locale) {
  const rows = await db
    .select()
    .from(noticeTranslation)
    .where(
      and(
        eq(noticeTranslation.noticeId, noticeId),
        eq(noticeTranslation.languageCode, locale),
        eq(noticeTranslation.reviewed, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listTranslationsForNotice(noticeId: string) {
  return db
    .select()
    .from(noticeTranslation)
    .where(eq(noticeTranslation.noticeId, noticeId));
}

export async function listTranslationsForNoticeIds(noticeIds: ReadonlyArray<string>) {
  if (noticeIds.length === 0) return [];
  return db
    .select()
    .from(noticeTranslation)
    .where(inArray(noticeTranslation.noticeId, [...noticeIds]));
}

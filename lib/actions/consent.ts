'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db/client';
import {
  user,
  purpose as purposeTable,
  consentTemplate,
  notice,
  noticeAck,
  noticeTranslation,
  cookieCategory,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { appendAudit } from '@/lib/audit/with-audit';
import { grantConsent, withdrawConsent } from '@/modules/consent/artefacts';
import { translateNoticeViaGemini } from '@/modules/consent/notice-translate';
import { LOCALES, type Locale } from '@/i18n/routing';

async function getActorContext() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error('not_authenticated');
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const row = rows[0];
  if (!row || !row.orgId) throw new Error('user_has_no_org');
  return {
    actorUserId: row.id,
    orgId: row.orgId,
    actorLabel: email,
  };
}

export async function grantConsentAction(formData: FormData) {
  const purposeId = String(formData.get('purposeId') ?? '');
  if (!purposeId) throw new Error('purposeId_required');
  const ctx = await getActorContext();
  await grantConsent({
    orgId: ctx.orgId,
    principalUserId: ctx.actorUserId,
    purposeId,
    audit: { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
  });
  revalidatePath('/me/consents');
}

export async function withdrawConsentAction(formData: FormData) {
  const purposeId = String(formData.get('purposeId') ?? '');
  if (!purposeId) throw new Error('purposeId_required');
  const ctx = await getActorContext();
  await withdrawConsent({
    orgId: ctx.orgId,
    principalUserId: ctx.actorUserId,
    purposeId,
    audit: { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
  });
  revalidatePath('/me/consents');
}

export async function createPurposeAction(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const lawfulBasis = String(formData.get('lawfulBasis') ?? 'consent').trim();
  const dataCategories = String(formData.get('dataCategories') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!code || !name) throw new Error('code_and_name_required');

  const ctx = await getActorContext();

  // Idempotency: if purpose with this code already exists, do nothing.
  const existing = await db
    .select()
    .from(purposeTable)
    .where(and(eq(purposeTable.orgId, ctx.orgId), eq(purposeTable.code, code)))
    .limit(1);
  if (existing[0]) {
    revalidatePath('/admin/consents');
    return;
  }

  const [p] = await db
    .insert(purposeTable)
    .values({
      orgId: ctx.orgId,
      code,
      name,
      description: description || null,
      lawfulBasis,
      dataCategories,
    })
    .returning();
  if (!p) throw new Error('purpose_insert_failed');

  // Seed a v1 published English template so grants can begin immediately.
  await db.insert(consentTemplate).values({
    orgId: ctx.orgId,
    purposeId: p.id,
    version: 1,
    languageCode: 'en',
    bodyMarkdown: `## Consent for ${name}\n\n${description || 'Purpose-specific consent under the DPDP Act 2023.'}\n\n- Lawful basis: ${lawfulBasis}\n- Data categories: ${dataCategories.join(', ') || 'as listed in the privacy notice'}`,
    publishedAt: new Date(),
  });

  await appendAudit(
    { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
    {
      stream: 'consent',
      action: 'purpose.created',
      target: p.id,
      payload: { code, name, lawfulBasis },
    },
  );

  revalidatePath('/admin/consents');
}

export async function acknowledgeNoticeAction(formData: FormData) {
  const noticeId = String(formData.get('noticeId') ?? '');
  if (!noticeId) throw new Error('noticeId_required');
  const ctx = await getActorContext();

  const nRows = await db.select().from(notice).where(eq(notice.id, noticeId)).limit(1);
  const n = nRows[0];
  if (!n) throw new Error('notice_not_found');

  await db.insert(noticeAck).values({
    orgId: ctx.orgId,
    principalUserId: ctx.actorUserId,
    noticeId,
  });

  await appendAudit(
    { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
    {
      stream: 'consent',
      action: 'notice.acknowledged',
      target: noticeId,
      payload: { slug: n.slug, version: n.version, languageCode: n.languageCode },
    },
  );

  revalidatePath('/me/notices');
}

export async function createCookieCategoryAction(formData: FormData) {
  const key = String(formData.get('key') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const isEssential = String(formData.get('isEssential') ?? '') === 'on';
  if (!key || !name) throw new Error('key_and_name_required');

  const ctx = await getActorContext();
  const existing = await db
    .select()
    .from(cookieCategory)
    .where(and(eq(cookieCategory.orgId, ctx.orgId), eq(cookieCategory.key, key)))
    .limit(1);
  if (existing[0]) {
    revalidatePath('/admin/cookies');
    return;
  }
  await db.insert(cookieCategory).values({
    orgId: ctx.orgId,
    key,
    name,
    description: description || null,
    isEssential,
  });
  await appendAudit(
    { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
    {
      stream: 'consent',
      action: 'cookie.category.created',
      target: key,
      payload: { name, isEssential },
    },
  );
  revalidatePath('/admin/cookies');
}

export async function createNoticeAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const title = String(formData.get('title') ?? '').trim();
  const bodyMarkdown = String(formData.get('bodyMarkdown') ?? '').trim();
  const publish = String(formData.get('publish') ?? '') === 'on';
  if (!slug || !title || !bodyMarkdown) throw new Error('slug_title_body_required');

  const ctx = await getActorContext();

  // Compute next version for (org, slug, languageCode='en').
  const rows = await db
    .select()
    .from(notice)
    .where(and(eq(notice.orgId, ctx.orgId), eq(notice.slug, slug), eq(notice.languageCode, 'en')));
  const nextVersion = rows.reduce((m, r) => Math.max(m, r.version), 0) + 1;

  const [created] = await db
    .insert(notice)
    .values({
      orgId: ctx.orgId,
      slug,
      title,
      bodyMarkdown,
      languageCode: 'en',
      version: nextVersion,
      publishedAt: publish ? new Date() : null,
    })
    .returning();
  if (!created) throw new Error('notice_insert_failed');

  await appendAudit(
    { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
    {
      stream: 'consent',
      action: publish ? 'notice.published' : 'notice.draft.created',
      target: created.id,
      payload: { slug, title, version: nextVersion },
    },
  );

  revalidatePath('/admin/notices');
}

/**
 * Generate translations for a notice into the locales submitted via the form.
 * Form field "locales" is a comma-separated list of language codes; an empty
 * value means "all 22 locales except English and any already translated".
 */
export async function translateNoticeAction(formData: FormData) {
  const noticeId = String(formData.get('noticeId') ?? '').trim();
  if (!noticeId) throw new Error('noticeId_required');

  const ctx = await getActorContext();

  const validLocales = new Set<string>(LOCALES);
  const checked = formData.getAll('localeCheck').map((v) => String(v).trim());
  const requested: Locale[] =
    checked.length > 0
      ? (checked.filter((s) => validLocales.has(s)) as Locale[])
      : (LOCALES.filter((l) => l !== 'en') as Locale[]);

  const result = await translateNoticeViaGemini(ctx.orgId, noticeId, requested);

  await appendAudit(
    { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
    {
      stream: 'consent',
      action: 'notice.translations_generated',
      target: noticeId,
      payload: {
        requested: requested.length,
        created: result.created,
        skipped: result.skipped,
        source: result.source,
      },
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/notices/${noticeId}` as any);
  revalidatePath('/admin/notices');
}

export async function approveNoticeTranslationAction(formData: FormData) {
  const translationId = String(formData.get('translationId') ?? '').trim();
  if (!translationId) throw new Error('translationId_required');

  const ctx = await getActorContext();

  const rows = await db
    .select()
    .from(noticeTranslation)
    .where(eq(noticeTranslation.id, translationId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error('translation_not_found');
  if (row.orgId !== ctx.orgId) throw new Error('org_mismatch');

  await db
    .update(noticeTranslation)
    .set({ reviewed: true, reviewedAt: new Date() })
    .where(eq(noticeTranslation.id, translationId));

  await appendAudit(
    { orgId: ctx.orgId, actorUserId: ctx.actorUserId, actorLabel: ctx.actorLabel },
    {
      stream: 'consent',
      action: 'notice.translation_approved',
      target: row.noticeId,
      payload: { languageCode: row.languageCode, translationId },
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/notices/${row.noticeId}` as any);
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { cookieCategory, cookieScanFinding } from '@/db/schema';
import { getActor, hasAnyRole } from './_actor';
import { appendAudit } from '@/lib/audit/with-audit';
import { runCookieScan } from '@/modules/cookies/scanner';

type Actor = Awaited<ReturnType<typeof getActor>>;

function requireOperator(actor: Actor) {
  if (!hasAnyRole(actor.roles, ['it_admin', 'dpo', 'privacy_steward'])) {
    throw new Error('forbidden — only it_admin / dpo / privacy_steward can scan cookies');
  }
}

export async function runCookieScanAction(formData: FormData) {
  const targetUrl = String(formData.get('targetUrl') ?? '').trim();
  if (!targetUrl) throw new Error('targetUrl_required');

  const actor = await getActor();
  requireOperator(actor);

  const result = await runCookieScan(actor.orgId, targetUrl, {
    orgId: actor.orgId,
    actorUserId: actor.actorUserId,
    actorLabel: actor.actorLabel,
  });

  revalidatePath('/admin/cookies');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect(`/admin/cookies/scans/${result.runId}` as any);
}

/**
 * Promote a scan finding to a real cookie_category row for the org.
 * Idempotent: if a category with the same key already exists, just no-ops.
 */
export async function promoteScanFindingAction(formData: FormData) {
  const findingId = String(formData.get('findingId') ?? '').trim();
  if (!findingId) throw new Error('findingId_required');

  const actor = await getActor();
  requireOperator(actor);

  const rows = await db
    .select()
    .from(cookieScanFinding)
    .where(eq(cookieScanFinding.id, findingId))
    .limit(1);
  const f = rows[0];
  if (!f) throw new Error('finding_not_found');

  const key = f.suggestedCategoryKey;
  const existing = await db
    .select()
    .from(cookieCategory)
    .where(and(eq(cookieCategory.orgId, actor.orgId), eq(cookieCategory.key, key)))
    .limit(1);

  if (!existing[0]) {
    await db.insert(cookieCategory).values({
      orgId: actor.orgId,
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      description: `Auto-created from cookie scanner (cookie ${f.cookieName}): ${f.suggestedRationale}`,
      isEssential: key === 'essential',
    });
    await appendAudit(
      {
        orgId: actor.orgId,
        actorUserId: actor.actorUserId,
        actorLabel: actor.actorLabel,
      },
      {
        stream: 'consent',
        action: 'cookie.category.promoted_from_scan',
        target: key,
        payload: { cookieName: f.cookieName, key, rationale: f.suggestedRationale },
      },
    );
  }

  revalidatePath('/admin/cookies');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/cookies/scans/${f.scanRunId}` as any);
}

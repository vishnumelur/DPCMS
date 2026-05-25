'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { nominee } from '@/db/schema';
import { appendAudit } from '@/lib/audit/with-audit';
import { getActor } from './_actor';

const ALLOWED_PERMISSIONS = new Set(['view', 'withdraw', 'erase']);

function asString(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim();
}

export async function addNomineeAction(formData: FormData): Promise<void> {
  const name = asString(formData.get('name'));
  const email = asString(formData.get('email')).toLowerCase();
  const relation = asString(formData.get('relation'));
  const permissions = formData
    .getAll('permissions')
    .map((p) => String(p))
    .filter((p) => ALLOWED_PERMISSIONS.has(p));

  if (!name) throw new Error('name_required');
  if (!email) throw new Error('email_required');
  if (!relation) throw new Error('relation_required');
  if (permissions.length === 0) throw new Error('at_least_one_permission_required');

  const actor = await getActor();

  const [created] = await db
    .insert(nominee)
    .values({
      orgId: actor.orgId,
      principalUserId: actor.actorUserId,
      name,
      email,
      relation,
      permissions,
      verificationStatus: 'pending',
    })
    .returning();
  if (!created) throw new Error('nominee_insert_failed');

  await appendAudit(
    { orgId: actor.orgId, actorUserId: actor.actorUserId, actorLabel: actor.actorLabel },
    {
      stream: 'nominee',
      action: 'nominee.added',
      target: created.id,
      payload: { name, relation, permissions },
    },
  );

  revalidatePath('/me/nominees');
}

export async function revokeNomineeAction(formData: FormData): Promise<void> {
  const nomineeId = asString(formData.get('nomineeId'));
  if (!nomineeId) throw new Error('nomineeId_required');

  const actor = await getActor();

  const rows = await db
    .select()
    .from(nominee)
    .where(and(eq(nominee.id, nomineeId), eq(nominee.principalUserId, actor.actorUserId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error('nominee_not_found_or_not_owned');

  await db.delete(nominee).where(eq(nominee.id, nomineeId));

  await appendAudit(
    { orgId: actor.orgId, actorUserId: actor.actorUserId, actorLabel: actor.actorLabel },
    {
      stream: 'nominee',
      action: 'nominee.revoked',
      target: nomineeId,
      payload: { name: row.name, relation: row.relation },
    },
  );

  revalidatePath('/me/nominees');
}

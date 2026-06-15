'use server';

import { revalidatePath } from 'next/cache';
import { getActor, hasAnyRole } from './_actor';
import { appendAudit } from '@/lib/audit/with-audit';

/**
 * Raise a Privacy by Design (PbD) request (RFP Annexure I §10).
 *
 * Internal teams use this to flag a personal-data-impacting change in an
 * application or process so the privacy team can evaluate, manage and monitor
 * it. Each request is appended to the hash-chained audit log under the `pbd`
 * stream — so the register is tamper-evident by construction and needs no
 * separate table.
 */
export async function raisePbdRequestAction(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const area = String(formData.get('area') ?? '').trim() || 'General';
  const description = String(formData.get('description') ?? '').trim();

  if (!title || !description) throw new Error('title_and_description_required');

  const actor = await getActor();
  if (
    !hasAnyRole(actor.roles, [
      'dpo',
      'privacy_steward',
      'it_admin',
      'branch_user',
      'auditor',
      'board',
    ])
  ) {
    throw new Error('forbidden');
  }

  await appendAudit(
    { orgId: actor.orgId, actorUserId: actor.actorUserId, actorLabel: actor.actorLabel },
    {
      stream: 'pbd',
      action: 'pbd.raised',
      target: title,
      payload: { title, area, description, status: 'RAISED' },
    },
  );

  revalidatePath('/admin/pbd');
}

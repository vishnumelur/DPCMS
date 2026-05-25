'use server';

import { revalidatePath } from 'next/cache';
import { getActor, hasAnyRole } from './_actor';
import { createActivity, updateActivity } from '@/modules/ropa/service';

function parseCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function requireRopaWriter(actor: { roles: ReadonlyArray<string> }) {
  if (
    !hasAnyRole(
      actor.roles as readonly never[],
      ['dpo', 'privacy_steward', 'it_admin'] as never[],
    )
  ) {
    throw new Error('forbidden');
  }
}

export async function createActivityAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const legalBasis = String(formData.get('legalBasis') ?? 'consent').trim() || 'consent';
  const purposeId = String(formData.get('purposeId') ?? '').trim() || null;
  const systemOfRecord = String(formData.get('systemOfRecord') ?? '').trim();
  const retentionPeriodMonths = Math.max(
    0,
    Number.parseInt(String(formData.get('retentionPeriodMonths') ?? '0'), 10) || 0,
  );
  const retentionRationale = String(formData.get('retentionRationale') ?? '').trim();
  const crossBorder = String(formData.get('crossBorder') ?? '') === 'on';
  const dataCategories = parseCsv(String(formData.get('dataCategories') ?? ''));
  const dataSubjects = parseCsv(String(formData.get('dataSubjects') ?? ''));
  const recipients = parseCsv(String(formData.get('recipients') ?? ''));

  if (!name || !description) throw new Error('name_and_description_required');

  const actor = await getActor();
  requireRopaWriter(actor);

  const row = await createActivity({
    orgId: actor.orgId,
    name,
    description,
    purposeId,
    legalBasis,
    dataCategories,
    dataSubjects,
    recipients,
    systemOfRecord,
    retentionPeriodMonths,
    retentionRationale,
    crossBorder,
    ownerUserId: actor.actorUserId,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/data-mapping');
  // Server actions used as <form action> must resolve to void; we discard the id.
  void row;
}

export async function updateActivityAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('id_required');

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const legalBasis = String(formData.get('legalBasis') ?? '').trim();
  const systemOfRecord = String(formData.get('systemOfRecord') ?? '').trim();
  const retentionPeriodMonths = Math.max(
    0,
    Number.parseInt(String(formData.get('retentionPeriodMonths') ?? '0'), 10) || 0,
  );
  const retentionRationale = String(formData.get('retentionRationale') ?? '').trim();
  const crossBorder = String(formData.get('crossBorder') ?? '') === 'on';
  const dataCategories = parseCsv(String(formData.get('dataCategories') ?? ''));
  const dataSubjects = parseCsv(String(formData.get('dataSubjects') ?? ''));
  const recipients = parseCsv(String(formData.get('recipients') ?? ''));

  const actor = await getActor();
  requireRopaWriter(actor);

  await updateActivity({
    orgId: actor.orgId,
    id,
    patch: {
      name,
      description,
      legalBasis,
      dataCategories,
      dataSubjects,
      recipients,
      systemOfRecord,
      retentionPeriodMonths,
      retentionRationale,
      crossBorder,
    },
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/data-mapping');
  revalidatePath(`/admin/data-mapping/${id}`);
}

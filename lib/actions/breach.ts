'use server';

import { revalidatePath } from 'next/cache';
import { getActor, hasAnyRole } from './_actor';
import {
  declareBreach,
  setSeverity,
  markContained,
  generateDpbReport,
  notifyDpb,
  closeIncident,
  BREACH_SEVERITIES,
  type BreachSeverity,
} from '@/modules/breach/service';

function asSeverity(raw: string): BreachSeverity {
  if ((BREACH_SEVERITIES as readonly string[]).includes(raw)) return raw as BreachSeverity;
  throw new Error('invalid_severity');
}

function requireBreachDeclarer(actor: { roles: ReadonlyArray<string> }) {
  if (!hasAnyRole(actor.roles as readonly never[], ['dpo', 'privacy_steward'] as never[])) {
    throw new Error('forbidden');
  }
}

export async function declareBreachAction(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const severity = asSeverity(String(formData.get('severity') ?? '').trim());
  const categories = String(formData.get('affectedDataCategories') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const countRaw = String(formData.get('estimatedAffectedCount') ?? '0').trim();
  const count = Math.max(0, Number.parseInt(countRaw, 10) || 0);
  if (!title || !description) throw new Error('title_and_description_required');

  const actor = await getActor();
  requireBreachDeclarer(actor);

  await declareBreach({
    orgId: actor.orgId,
    declaredByUserId: actor.actorUserId,
    title,
    description,
    severity,
    affectedDataCategories: categories,
    estimatedAffectedCount: count,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/breach');
}

export async function setSeverityAction(formData: FormData) {
  const incidentId = String(formData.get('incidentId') ?? '').trim();
  const severity = asSeverity(String(formData.get('severity') ?? '').trim());
  const notes = String(formData.get('notes') ?? '').trim();
  if (!incidentId) throw new Error('incidentId_required');

  const actor = await getActor();
  requireBreachDeclarer(actor);

  await setSeverity({
    incidentId,
    severity,
    notes: notes || undefined,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/breach');
  revalidatePath(`/admin/breach/${incidentId}`);
}

export async function containAction(formData: FormData) {
  const incidentId = String(formData.get('incidentId') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim() || 'Containment recorded.';
  if (!incidentId) throw new Error('incidentId_required');

  const actor = await getActor();
  requireBreachDeclarer(actor);

  await markContained({
    incidentId,
    notes,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/breach');
  revalidatePath(`/admin/breach/${incidentId}`);
}

export async function generateReportAction(incidentId: string): Promise<string> {
  const actor = await getActor();
  requireBreachDeclarer(actor);
  return generateDpbReport(actor.orgId, incidentId);
}

export async function notifyDpbAction(formData: FormData) {
  const incidentId = String(formData.get('incidentId') ?? '').trim();
  if (!incidentId) throw new Error('incidentId_required');

  const actor = await getActor();
  requireBreachDeclarer(actor);

  const draft = await generateDpbReport(actor.orgId, incidentId);
  await notifyDpb({
    incidentId,
    draftMarkdown: draft,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/breach');
  revalidatePath(`/admin/breach/${incidentId}`);
}

export async function closeAction(formData: FormData) {
  const incidentId = String(formData.get('incidentId') ?? '').trim();
  const rootCause = String(formData.get('rootCause') ?? '').trim() || 'Not specified.';
  if (!incidentId) throw new Error('incidentId_required');

  const actor = await getActor();
  requireBreachDeclarer(actor);

  await closeIncident({
    incidentId,
    rootCause,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/breach');
  revalidatePath(`/admin/breach/${incidentId}`);
}

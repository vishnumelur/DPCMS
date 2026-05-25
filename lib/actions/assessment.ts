'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActor, hasAnyRole } from './_actor';
import {
  createAssessment,
  addResponse,
  submitAssessment,
  approveAssessment,
  aiPrefillAssessment,
} from '@/modules/assessment/service';
import {
  ASSESSMENT_KINDS,
  templateFor,
  type AssessmentKind,
} from '@/modules/assessment/templates';

function asKind(raw: string): AssessmentKind {
  if ((ASSESSMENT_KINDS as readonly string[]).includes(raw)) return raw as AssessmentKind;
  throw new Error('invalid_kind');
}

function pathFor(kind: AssessmentKind) {
  return kind === 'pia' ? '/admin/pia' : '/admin/dpia';
}

function requireAnyRole(actor: { roles: ReadonlyArray<string> }) {
  // Anyone with an org role can create an assessment.
  if (!actor.roles.length) throw new Error('forbidden');
}

function requireSubmitter(actor: { roles: ReadonlyArray<string> }) {
  if (
    !hasAnyRole(
      actor.roles as readonly never[],
      ['dpo', 'privacy_steward'] as never[],
    )
  ) {
    throw new Error('forbidden');
  }
}

function requireDpo(actor: { roles: ReadonlyArray<string> }) {
  if (!hasAnyRole(actor.roles as readonly never[], ['dpo'] as never[])) {
    throw new Error('forbidden');
  }
}

export async function createAssessmentAction(formData: FormData) {
  const kind = asKind(String(formData.get('kind') ?? '').trim());
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const processingActivityId =
    String(formData.get('processingActivityId') ?? '').trim() || null;

  if (!title) throw new Error('title_required');

  const actor = await getActor();
  requireAnyRole(actor);

  const row = await createAssessment({
    orgId: actor.orgId,
    kind,
    title,
    description,
    processingActivityId,
    createdByUserId: actor.actorUserId,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath(pathFor(kind));
  // typed-routes: cast the dynamic detail path before redirecting.
  const target = `${pathFor(kind)}/${row.id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect(target as any);
}

export async function addResponseAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '').trim();
  const kind = asKind(String(formData.get('kind') ?? '').trim());
  if (!assessmentId) throw new Error('assessmentId_required');

  const actor = await getActor();
  requireAnyRole(actor);

  const template = templateFor(kind);
  for (const q of template) {
    const answer = String(formData.get(`answer_${q.key}`) ?? '').trim();
    const scoreRaw = String(formData.get(`score_${q.key}`) ?? '0').trim();
    const score = Math.max(0, Math.min(5, Number.parseInt(scoreRaw, 10) || 0));
    await addResponse({
      orgId: actor.orgId,
      assessmentId,
      questionKey: q.key,
      questionLabel: q.label,
      weight: q.weight,
      answer,
      score,
      audit: {
        orgId: actor.orgId,
        actorUserId: actor.actorUserId,
        actorLabel: actor.actorLabel,
      },
    });
  }

  revalidatePath(`${pathFor(kind)}/${assessmentId}`);
  revalidatePath(pathFor(kind));
}

export async function submitAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '').trim();
  const kind = asKind(String(formData.get('kind') ?? '').trim());
  if (!assessmentId) throw new Error('assessmentId_required');

  const actor = await getActor();
  requireSubmitter(actor);

  await submitAssessment({
    orgId: actor.orgId,
    assessmentId,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath(`${pathFor(kind)}/${assessmentId}`);
  revalidatePath(pathFor(kind));
}

export async function approveAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '').trim();
  const kind = asKind(String(formData.get('kind') ?? '').trim());
  if (!assessmentId) throw new Error('assessmentId_required');

  const actor = await getActor();
  requireDpo(actor);

  await approveAssessment({
    orgId: actor.orgId,
    assessmentId,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath(`${pathFor(kind)}/${assessmentId}`);
  revalidatePath(pathFor(kind));
}

export type AiPrefillActionResult =
  | { ok: true; source: 'ai' | 'fallback'; count: number }
  | { ok: false; error: string };

export async function aiPrefillAction(
  assessmentId: string,
  kind: AssessmentKind,
): Promise<AiPrefillActionResult> {
  if (!assessmentId) return { ok: false, error: 'assessmentId_required' };

  const actor = await getActor();
  requireAnyRole(actor);

  try {
    const result = await aiPrefillAssessment({
      orgId: actor.orgId,
      assessmentId,
      audit: {
        orgId: actor.orgId,
        actorUserId: actor.actorUserId,
        actorLabel: actor.actorLabel,
      },
    });
    revalidatePath(`${pathFor(kind)}/${assessmentId}`);
    revalidatePath(pathFor(kind));
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

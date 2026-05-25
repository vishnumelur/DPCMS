import { db } from '@/db/client';
import {
  assessment,
  assessmentAction,
  assessmentResponse,
  processingActivity,
  aiCallLog,
} from '@/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';
import { computeRiskScore } from './scoring';
import {
  templateFor,
  type AssessmentKind,
  type AssessmentQuestion,
} from './templates';
import { aiGenerateText } from '@/lib/ai/gateway';
import { env } from '@/lib/env';
import { redactPII } from '@/lib/ai/redact';

export type CreateAssessmentInput = {
  orgId: string;
  kind: AssessmentKind;
  title: string;
  description: string;
  processingActivityId?: string | null;
  createdByUserId: string;
  audit: AuditContext;
};

export async function createAssessment(input: CreateAssessmentInput) {
  const [row] = await db
    .insert(assessment)
    .values({
      orgId: input.orgId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      processingActivityId: input.processingActivityId ?? null,
      status: 'draft',
      createdByUserId: input.createdByUserId,
    })
    .returning();
  if (!row) throw new Error('assessment_insert_failed');

  // Materialise the template questions as empty responses so the UI has rows
  // to render and so scoring works immediately.
  const template = templateFor(input.kind);
  if (template.length) {
    await db.insert(assessmentResponse).values(
      template.map((q) => ({
        assessmentId: row.id,
        questionKey: q.key,
        questionLabel: q.label,
        answer: '',
        weight: q.weight,
        score: 0,
      })),
    );
  }

  await db.insert(assessmentAction).values({
    orgId: input.orgId,
    assessmentId: row.id,
    kind: 'created',
    notes: `${input.kind.toUpperCase()} created by ${input.audit.actorLabel}.`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'assessment',
    action: 'assessment.created',
    target: row.id,
    payload: {
      kind: input.kind,
      title: input.title,
      processingActivityId: input.processingActivityId ?? null,
    },
  });

  return row;
}

export type UpsertResponseInput = {
  orgId: string;
  assessmentId: string;
  questionKey: string;
  questionLabel: string;
  weight: number;
  answer: string;
  score: number;
  audit: AuditContext;
};

export async function addResponse(input: UpsertResponseInput) {
  const existing = await db
    .select()
    .from(assessmentResponse)
    .where(
      and(
        eq(assessmentResponse.assessmentId, input.assessmentId),
        eq(assessmentResponse.questionKey, input.questionKey),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(assessmentResponse)
      .set({
        answer: input.answer,
        score: input.score,
        weight: input.weight,
        questionLabel: input.questionLabel,
      })
      .where(eq(assessmentResponse.id, existing[0].id));
  } else {
    await db.insert(assessmentResponse).values({
      assessmentId: input.assessmentId,
      questionKey: input.questionKey,
      questionLabel: input.questionLabel,
      answer: input.answer,
      score: input.score,
      weight: input.weight,
    });
  }

  await recomputeScore(input.assessmentId);

  await db.insert(assessmentAction).values({
    orgId: input.orgId,
    assessmentId: input.assessmentId,
    kind: 'updated',
    notes: `Response updated for "${input.questionKey}".`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'assessment',
    action: 'assessment.response_set',
    target: input.assessmentId,
    payload: { questionKey: input.questionKey, score: input.score },
  });
}

async function recomputeScore(assessmentId: string) {
  const rows = await db
    .select({ score: assessmentResponse.score, weight: assessmentResponse.weight })
    .from(assessmentResponse)
    .where(eq(assessmentResponse.assessmentId, assessmentId));
  const { score, level } = computeRiskScore(rows);
  await db
    .update(assessment)
    .set({ riskScore: score, riskLevel: level, updatedAt: new Date() })
    .where(eq(assessment.id, assessmentId));
}

export async function submitAssessment(input: {
  orgId: string;
  assessmentId: string;
  audit: AuditContext;
}) {
  const row = await getAssessment(input.orgId, input.assessmentId);
  if (!row) throw new Error('assessment_not_found');
  if (row.status !== 'draft') throw new Error('assessment_not_draft');

  await db
    .update(assessment)
    .set({ status: 'in_review', updatedAt: new Date() })
    .where(eq(assessment.id, input.assessmentId));

  await db.insert(assessmentAction).values({
    orgId: input.orgId,
    assessmentId: input.assessmentId,
    kind: 'submitted',
    notes: `Submitted for DPO review by ${input.audit.actorLabel}.`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'assessment',
    action: 'assessment.submitted',
    target: input.assessmentId,
    payload: { from: 'draft', to: 'in_review' },
  });
}

export async function approveAssessment(input: {
  orgId: string;
  assessmentId: string;
  audit: AuditContext;
}) {
  const row = await getAssessment(input.orgId, input.assessmentId);
  if (!row) throw new Error('assessment_not_found');
  if (row.status !== 'in_review') throw new Error('assessment_not_in_review');

  await db
    .update(assessment)
    .set({
      status: 'approved',
      reviewedByUserId: input.audit.actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(assessment.id, input.assessmentId));

  await db.insert(assessmentAction).values({
    orgId: input.orgId,
    assessmentId: input.assessmentId,
    kind: 'approved',
    notes: `Approved by DPO (${input.audit.actorLabel}).`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'assessment',
    action: 'assessment.approved',
    target: input.assessmentId,
    payload: { from: 'in_review', to: 'approved' },
  });
}

export async function listAssessments(orgId: string, kind: AssessmentKind) {
  return db
    .select()
    .from(assessment)
    .where(and(eq(assessment.orgId, orgId), eq(assessment.kind, kind)))
    .orderBy(desc(assessment.createdAt));
}

export async function getAssessment(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(assessment)
    .where(and(eq(assessment.id, id), eq(assessment.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listResponses(assessmentId: string) {
  return db
    .select()
    .from(assessmentResponse)
    .where(eq(assessmentResponse.assessmentId, assessmentId))
    .orderBy(asc(assessmentResponse.questionKey));
}

export async function listActions(assessmentId: string) {
  return db
    .select()
    .from(assessmentAction)
    .where(eq(assessmentAction.assessmentId, assessmentId))
    .orderBy(asc(assessmentAction.createdAt));
}

export type AiPrefillResult = {
  ok: true;
  source: 'ai' | 'fallback';
  count: number;
};

/**
 * Ask the AI gateway to suggest answers for every template question on this
 * assessment, given the linked processing activity as context. Non-destructive:
 * refuses if any existing response already has a non-empty answer.
 *
 * Falls back to a deterministic placeholder generator when AI_GATEWAY_API_KEY
 * is not configured, or whenever the gateway call throws. Always logs to
 * ai_call_log so the audit story stays consistent.
 */
export async function aiPrefillAssessment(input: {
  orgId: string;
  assessmentId: string;
  audit: AuditContext;
}): Promise<AiPrefillResult> {
  const a = await getAssessment(input.orgId, input.assessmentId);
  if (!a) throw new Error('assessment_not_found');
  if (!a.processingActivityId)
    throw new Error('no_linked_activity — link this assessment to a processing activity first');

  // Refuse to overwrite anything already typed in.
  const existing = await listResponses(input.assessmentId);
  if (existing.some((r) => r.answer.trim().length > 0)) {
    throw new Error('responses_exist — clear existing responses before re-running AI prefill');
  }

  const actRows = await db
    .select()
    .from(processingActivity)
    .where(eq(processingActivity.id, a.processingActivityId))
    .limit(1);
  const activity = actRows[0];
  if (!activity) throw new Error('linked_activity_not_found');

  const template = templateFor(a.kind as AssessmentKind);
  const activitySummary = redactPII(
    [
      `Activity: ${activity.name}`,
      `Description: ${activity.description}`,
      `Legal basis: ${activity.legalBasis}`,
      `Data categories: ${activity.dataCategories.join(', ') || '—'}`,
      `Data subjects: ${activity.dataSubjects.join(', ') || '—'}`,
      `Recipients: ${activity.recipients.join(', ') || '—'}`,
      `System of record: ${activity.systemOfRecord || '—'}`,
      `Retention: ${activity.retentionPeriodMonths} months — ${activity.retentionRationale || '—'}`,
      `Cross-border: ${activity.crossBorder ? 'yes' : 'no'}`,
    ].join('\n'),
  );

  let suggestions = new Map<string, string>();
  let source: 'ai' | 'fallback' = 'fallback';

  if (env.AI_GATEWAY_API_KEY) {
    try {
      const prompt = buildPrompt(template, activitySummary, a.kind as AssessmentKind);
      const raw = await aiGenerateText(
        { orgId: input.orgId, purpose: 'assessment.ai_prefill' },
        [
          {
            role: 'system',
            content:
              'You are a DPDP-Act privacy assessor for an Indian cooperative bank. ' +
              'Answer each question concisely (2-4 sentences) in plain English. ' +
              'Return STRICT JSON of shape {"key": "answer"} with one key per question.',
          },
          { role: 'user', content: prompt },
        ],
      );
      suggestions = parseJsonAnswers(raw, template);
      source = 'ai';
    } catch (err) {
      console.warn('[assessment.aiPrefill] gateway failed, using fallback:', err);
      suggestions = deterministicFallback(template, activity);
    }
  } else {
    suggestions = deterministicFallback(template, activity);
    // Still record the call so audit shows the AI surface was exercised.
    await db.insert(aiCallLog).values({
      orgId: input.orgId,
      model: 'fallback/deterministic',
      purpose: 'assessment.ai_prefill',
      promptRedacted: { activitySummary, template: template.map((q) => q.key) },
      responseRedacted: {
        text: '[deterministic fallback — AI_GATEWAY_API_KEY not set]',
      },
      promptTokens: null,
      completionTokens: null,
    });
  }

  // Persist non-empty responses and recompute the risk score.
  for (const q of template) {
    const answer = suggestions.get(q.key) ?? `(no suggestion for ${q.key})`;
    // Default mid-band score so the live risk score becomes visible.
    const score = 3;
    await db
      .update(assessmentResponse)
      .set({ answer, score, weight: q.weight, questionLabel: q.label })
      .where(
        and(
          eq(assessmentResponse.assessmentId, input.assessmentId),
          eq(assessmentResponse.questionKey, q.key),
        ),
      );
  }

  await recomputeScore(input.assessmentId);
  await db
    .update(assessment)
    .set({ aiPrefilled: true, updatedAt: new Date() })
    .where(eq(assessment.id, input.assessmentId));

  await db.insert(assessmentAction).values({
    orgId: input.orgId,
    assessmentId: input.assessmentId,
    kind: 'ai_prefilled',
    notes: `AI prefill (${source}) populated ${template.length} responses.`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'assessment',
    action: 'assessment.ai_prefilled',
    target: input.assessmentId,
    payload: { source, count: template.length },
  });

  return { ok: true, source, count: template.length };
}

function buildPrompt(
  template: readonly AssessmentQuestion[],
  activitySummary: string,
  kind: AssessmentKind,
): string {
  const questions = template
    .map((q, i) => `${i + 1}. (${q.key}) ${q.label}`)
    .join('\n');
  return [
    `Processing activity context for the ${kind.toUpperCase()}:`,
    '---',
    activitySummary,
    '---',
    'Please answer the following questions concisely, returning a single JSON object',
    'whose keys are the question keys above and whose values are the answers:',
    questions,
  ].join('\n');
}

function parseJsonAnswers(
  raw: string,
  template: readonly AssessmentQuestion[],
): Map<string, string> {
  const out = new Map<string, string>();
  try {
    // Pull out the first JSON object — models sometimes wrap with prose.
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) throw new Error('no json');
    const json = JSON.parse(raw.slice(first, last + 1)) as Record<string, unknown>;
    for (const q of template) {
      const v = json[q.key];
      if (typeof v === 'string' && v.trim().length) out.set(q.key, v.trim());
    }
  } catch {
    // ignore — caller falls back if the map is empty for required keys
  }
  return out;
}

function deterministicFallback(
  template: readonly AssessmentQuestion[],
  activity: {
    name: string;
    description: string;
    legalBasis: string;
    dataCategories: string[];
    dataSubjects: string[];
    recipients: string[];
    retentionPeriodMonths: number;
    retentionRationale: string;
    crossBorder: boolean;
  },
): Map<string, string> {
  const m = new Map<string, string>();
  for (const q of template) {
    switch (q.key) {
      case 'purpose':
        m.set(q.key, `Purpose: ${activity.name}. ${activity.description}`);
        break;
      case 'data_categories':
        m.set(
          q.key,
          activity.dataCategories.length
            ? `Categories processed: ${activity.dataCategories.join(', ')}.`
            : 'No specific categories declared — please complete this answer.',
        );
        break;
      case 'lawful_basis':
        m.set(q.key, `Lawful basis under the DPDP Act: ${activity.legalBasis}.`);
        break;
      case 'data_subjects':
        m.set(
          q.key,
          activity.dataSubjects.length
            ? `Data subjects: ${activity.dataSubjects.join(', ')}.`
            : 'Data subjects not declared — please confirm cohort.',
        );
        break;
      case 'retention':
        m.set(
          q.key,
          `Retained for ${activity.retentionPeriodMonths} months. Rationale: ${
            activity.retentionRationale || 'not specified'
          }.`,
        );
        break;
      case 'third_party_sharing':
        m.set(
          q.key,
          activity.recipients.length
            ? `Shared with: ${activity.recipients.join(', ')}.`
            : 'No third-party sharing declared.',
        );
        break;
      case 'automated_decisioning':
        m.set(
          q.key,
          'POC default: no automated decisioning declared. Confirm with the business owner before approval.',
        );
        break;
      case 'cross_border_transfer':
        m.set(
          q.key,
          activity.crossBorder
            ? 'Cross-border transfer flagged on the RoPA. Document destination jurisdictions and the transfer mechanism.'
            : 'No cross-border transfer declared on the RoPA.',
        );
        break;
      case 'contingency_plan':
        m.set(
          q.key,
          'Reference the M9 breach runbook: detect → assess → contain → notify DPB within 72h → notify principals.',
        );
        break;
      case 'dpo_consulted':
        m.set(
          q.key,
          'DPO consultation pending — capture sign-off and any conditions before approval.',
        );
        break;
      default:
        m.set(q.key, '(deterministic fallback — please complete this answer.)');
    }
  }
  return m;
}

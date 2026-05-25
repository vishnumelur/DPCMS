import { db } from '@/db/client';
import {
  breachIncident,
  breachAction,
  breachNotification,
  breachCohort,
} from '@/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';
import { renderDpbReport } from './templates/dpb-report';

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus =
  | 'detected'
  | 'assessing'
  | 'contained'
  | 'reported_dpb'
  | 'closed';

export const BREACH_SEVERITIES: readonly BreachSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export type DeclareBreachInput = {
  orgId: string;
  declaredByUserId: string;
  title: string;
  description: string;
  severity: BreachSeverity;
  affectedDataCategories: string[];
  estimatedAffectedCount: number;
  audit: AuditContext;
};

export async function declareBreach(input: DeclareBreachInput) {
  const detectedAt = new Date();
  const deadline = new Date(detectedAt.getTime() + SEVENTY_TWO_HOURS_MS);

  const [incident] = await db
    .insert(breachIncident)
    .values({
      orgId: input.orgId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: 'detected',
      detectedAt,
      reportingDeadlineAt: deadline,
      declaredByUserId: input.declaredByUserId,
      affectedDataCategories: input.affectedDataCategories,
      estimatedAffectedCount: input.estimatedAffectedCount,
    })
    .returning();
  if (!incident) throw new Error('breach_insert_failed');

  await db.insert(breachAction).values({
    orgId: input.orgId,
    incidentId: incident.id,
    kind: 'detected',
    notes: `Incident declared by ${input.audit.actorLabel}.`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'breach',
    action: 'breach.declared',
    target: incident.id,
    payload: {
      severity: input.severity,
      title: input.title,
      affectedCategories: input.affectedDataCategories,
      estimatedAffectedCount: input.estimatedAffectedCount,
    },
  });

  return incident;
}

export type SetSeverityInput = {
  incidentId: string;
  severity: BreachSeverity;
  notes?: string;
  audit: AuditContext;
};

export async function setSeverity(input: SetSeverityInput) {
  const rows = await db
    .select()
    .from(breachIncident)
    .where(eq(breachIncident.id, input.incidentId))
    .limit(1);
  const incident = rows[0];
  if (!incident) throw new Error('incident_not_found');
  if (incident.orgId !== input.audit.orgId) throw new Error('org_mismatch');

  const previous = incident.severity;
  await db
    .update(breachIncident)
    .set({
      severity: input.severity,
      status: incident.status === 'detected' ? 'assessing' : incident.status,
      updatedAt: new Date(),
    })
    .where(eq(breachIncident.id, input.incidentId));

  await db.insert(breachAction).values({
    orgId: input.audit.orgId,
    incidentId: input.incidentId,
    kind: 'severity_set',
    notes:
      input.notes?.trim() ||
      `Severity changed from ${previous} → ${input.severity}.`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'breach',
    action: 'breach.severity_set',
    target: input.incidentId,
    payload: { from: previous, to: input.severity },
  });
}

export async function markContained(input: {
  incidentId: string;
  notes: string;
  audit: AuditContext;
}) {
  const rows = await db
    .select()
    .from(breachIncident)
    .where(eq(breachIncident.id, input.incidentId))
    .limit(1);
  const incident = rows[0];
  if (!incident) throw new Error('incident_not_found');
  if (incident.orgId !== input.audit.orgId) throw new Error('org_mismatch');

  await db
    .update(breachIncident)
    .set({ status: 'contained', updatedAt: new Date() })
    .where(eq(breachIncident.id, input.incidentId));

  await db.insert(breachAction).values({
    orgId: input.audit.orgId,
    incidentId: input.incidentId,
    kind: 'contained',
    notes: input.notes,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'breach',
    action: 'breach.contained',
    target: input.incidentId,
    payload: { notes: input.notes },
  });
}

export async function generateDpbReport(orgId: string, incidentId: string): Promise<string> {
  const rows = await db
    .select()
    .from(breachIncident)
    .where(and(eq(breachIncident.id, incidentId), eq(breachIncident.orgId, orgId)))
    .limit(1);
  const incident = rows[0];
  if (!incident) throw new Error('incident_not_found');

  const actions = await db
    .select()
    .from(breachAction)
    .where(eq(breachAction.incidentId, incidentId))
    .orderBy(asc(breachAction.createdAt));

  const cohort = await db
    .select({ id: breachCohort.id })
    .from(breachCohort)
    .where(eq(breachCohort.incidentId, incidentId));

  return renderDpbReport(incident, actions, cohort.length);
}

export type NotifyDpbInput = {
  incidentId: string;
  draftMarkdown: string;
  audit: AuditContext;
};

export async function notifyDpb(input: NotifyDpbInput) {
  const rows = await db
    .select()
    .from(breachIncident)
    .where(eq(breachIncident.id, input.incidentId))
    .limit(1);
  const incident = rows[0];
  if (!incident) throw new Error('incident_not_found');
  if (incident.orgId !== input.audit.orgId) throw new Error('org_mismatch');

  const now = new Date();
  await db.insert(breachNotification).values({
    orgId: input.audit.orgId,
    incidentId: input.incidentId,
    audience: 'dpb',
    draftMarkdown: input.draftMarkdown,
    sentAt: now,
    recipientCohortDescription: 'Data Protection Board of India (POC stub — no transport)',
  });

  await db
    .update(breachIncident)
    .set({ status: 'reported_dpb', reportedAt: now, updatedAt: now })
    .where(eq(breachIncident.id, input.incidentId));

  await db.insert(breachAction).values({
    orgId: input.audit.orgId,
    incidentId: input.incidentId,
    kind: 'dpb_notified',
    notes: 'DPB notification recorded (UI stub — no actual transport).',
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'breach',
    action: 'breach.dpb_notified',
    target: input.incidentId,
    payload: { sentAt: now.toISOString(), draftLen: input.draftMarkdown.length },
  });
}

export async function closeIncident(input: {
  incidentId: string;
  rootCause: string;
  audit: AuditContext;
}) {
  const rows = await db
    .select()
    .from(breachIncident)
    .where(eq(breachIncident.id, input.incidentId))
    .limit(1);
  const incident = rows[0];
  if (!incident) throw new Error('incident_not_found');
  if (incident.orgId !== input.audit.orgId) throw new Error('org_mismatch');

  await db
    .update(breachIncident)
    .set({
      status: 'closed',
      rootCause: input.rootCause,
      updatedAt: new Date(),
    })
    .where(eq(breachIncident.id, input.incidentId));

  await db.insert(breachAction).values({
    orgId: input.audit.orgId,
    incidentId: input.incidentId,
    kind: 'closed',
    notes: `Incident closed. Root cause: ${input.rootCause}`,
    actorUserId: input.audit.actorUserId,
  });

  await appendAudit(input.audit, {
    stream: 'breach',
    action: 'breach.closed',
    target: input.incidentId,
    payload: { rootCause: input.rootCause },
  });
}

export async function listIncidents(orgId: string) {
  return db
    .select()
    .from(breachIncident)
    .where(eq(breachIncident.orgId, orgId))
    .orderBy(desc(breachIncident.detectedAt));
}

export async function getIncident(orgId: string, incidentId: string) {
  const rows = await db
    .select()
    .from(breachIncident)
    .where(and(eq(breachIncident.id, incidentId), eq(breachIncident.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listActions(incidentId: string) {
  return db
    .select()
    .from(breachAction)
    .where(eq(breachAction.incidentId, incidentId))
    .orderBy(asc(breachAction.createdAt));
}

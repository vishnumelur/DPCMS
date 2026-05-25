import { db } from '@/db/client';
import { dsrRequest, dsrEvent, slaClock } from '@/db/schema';
import { and, asc, eq, desc } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';
import { dsrFlow, type DsrEventName, type DsrState, type DsrGuardCtx } from './flow';
import { transition } from '@/lib/workflow/engine';
import { computeSlaState, deriveThresholds } from './sla';
import type { RoleKind } from '@/lib/auth/rbac';

export type DsrKind =
  | 'access'
  | 'correction'
  | 'erasure'
  | 'revoke_consent'
  | 'grievance'
  | 'nominate';

export const DSR_KINDS: readonly DsrKind[] = [
  'access',
  'correction',
  'erasure',
  'revoke_consent',
  'grievance',
  'nominate',
] as const;

export type CreateDsrInput = {
  orgId: string;
  principalUserId: string;
  kind: DsrKind;
  subject: string;
  details: string;
  branchId?: string | null;
  audit: AuditContext;
};

export async function createDsr(input: CreateDsrInput) {
  const now = new Date();
  const thresholds = deriveThresholds(now);

  const [row] = await db
    .insert(dsrRequest)
    .values({
      orgId: input.orgId,
      principalUserId: input.principalUserId,
      kind: input.kind,
      status: 'received',
      subject: input.subject,
      details: input.details,
      branchId: input.branchId ?? null,
      slaDueAt: thresholds.thresholdRed,
    })
    .returning();
  if (!row) throw new Error('dsr_insert_failed');

  await db.insert(slaClock).values({
    orgId: input.orgId,
    requestId: row.id,
    thresholdAmber: thresholds.thresholdAmber,
    thresholdRed: thresholds.thresholdRed,
    state: 'green',
  });

  const audit = await appendAudit(input.audit, {
    stream: 'dsr',
    action: 'dsr.created',
    target: row.id,
    payload: { kind: input.kind, subject: input.subject },
  });

  await db.insert(dsrEvent).values({
    orgId: input.orgId,
    requestId: row.id,
    eventKind: 'state_changed',
    payload: { from: null, to: 'received', kind: input.kind },
    actorLabel: input.audit.actorLabel,
    actorUserId: input.audit.actorUserId,
    rowHash: audit.rowHash,
  });

  return row;
}

export type TransitionDsrInput = {
  requestId: string;
  event: DsrEventName;
  actorRole: RoleKind;
  note?: string;
  audit: AuditContext;
};

export async function transitionDsr(input: TransitionDsrInput) {
  const rows = await db
    .select()
    .from(dsrRequest)
    .where(eq(dsrRequest.id, input.requestId))
    .limit(1);
  const req = rows[0];
  if (!req) throw new Error('dsr_not_found');
  if (req.orgId !== input.audit.orgId) throw new Error('org_mismatch');

  const ctx: DsrGuardCtx = { role: input.actorRole };
  const r = transition(dsrFlow, req.status as DsrState, input.event, ctx);
  if (!r.ok) throw new Error(`transition_denied: ${r.reason}`);

  await db
    .update(dsrRequest)
    .set({ status: r.to, updatedAt: new Date() })
    .where(eq(dsrRequest.id, input.requestId));

  // Recompute SLA on every transition so the queue badge is fresh.
  const clockRows = await db
    .select()
    .from(slaClock)
    .where(eq(slaClock.requestId, input.requestId))
    .limit(1);
  const clock = clockRows[0];
  if (clock) {
    const newState = computeSlaState({
      thresholdAmber: clock.thresholdAmber,
      thresholdRed: clock.thresholdRed,
    });
    await db
      .update(slaClock)
      .set({ state: newState, lastEvaluatedAt: new Date() })
      .where(eq(slaClock.id, clock.id));
  }

  const audit = await appendAudit(input.audit, {
    stream: 'dsr',
    action: 'dsr.transitioned',
    target: input.requestId,
    payload: { from: req.status, to: r.to, event: input.event, note: input.note ?? null },
  });

  await db.insert(dsrEvent).values({
    orgId: input.audit.orgId,
    requestId: input.requestId,
    eventKind: 'state_changed',
    payload: {
      from: req.status,
      to: r.to,
      event: input.event,
      note: input.note ?? null,
    },
    actorLabel: input.audit.actorLabel,
    actorUserId: input.audit.actorUserId,
    rowHash: audit.rowHash,
  });

  return { from: req.status as DsrState, to: r.to };
}

export async function listMyDsrs(orgId: string, principalUserId: string) {
  return db
    .select()
    .from(dsrRequest)
    .where(and(eq(dsrRequest.orgId, orgId), eq(dsrRequest.principalUserId, principalUserId)))
    .orderBy(desc(dsrRequest.createdAt));
}

export async function listOrgDsrs(orgId: string) {
  return db
    .select()
    .from(dsrRequest)
    .where(eq(dsrRequest.orgId, orgId))
    .orderBy(desc(dsrRequest.createdAt));
}

export async function getDsr(requestId: string) {
  const rows = await db
    .select()
    .from(dsrRequest)
    .where(eq(dsrRequest.id, requestId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDsrEvents(requestId: string) {
  return db
    .select()
    .from(dsrEvent)
    .where(eq(dsrEvent.requestId, requestId))
    .orderBy(asc(dsrEvent.createdAt));
}

export async function getSlaClock(requestId: string) {
  const rows = await db
    .select()
    .from(slaClock)
    .where(eq(slaClock.requestId, requestId))
    .limit(1);
  return rows[0] ?? null;
}

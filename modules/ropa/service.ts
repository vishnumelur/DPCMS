import { db } from '@/db/client';
import { processingActivity, purpose } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';

export type CreateActivityInput = {
  orgId: string;
  name: string;
  description: string;
  purposeId?: string | null;
  legalBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  systemOfRecord: string;
  retentionPeriodMonths: number;
  retentionRationale: string;
  crossBorder: boolean;
  branchId?: string | null;
  ownerUserId?: string | null;
  audit: AuditContext;
};

export async function createActivity(input: CreateActivityInput) {
  const [row] = await db
    .insert(processingActivity)
    .values({
      orgId: input.orgId,
      name: input.name,
      description: input.description,
      purposeId: input.purposeId ?? null,
      legalBasis: input.legalBasis,
      dataCategories: input.dataCategories,
      dataSubjects: input.dataSubjects,
      recipients: input.recipients,
      systemOfRecord: input.systemOfRecord,
      retentionPeriodMonths: input.retentionPeriodMonths,
      retentionRationale: input.retentionRationale,
      crossBorder: input.crossBorder,
      branchId: input.branchId ?? null,
      ownerUserId: input.ownerUserId ?? null,
    })
    .returning();
  if (!row) throw new Error('processing_activity_insert_failed');

  await appendAudit(input.audit, {
    stream: 'ropa',
    action: 'ropa.created',
    target: row.id,
    payload: {
      name: row.name,
      legalBasis: row.legalBasis,
      crossBorder: row.crossBorder,
      recipients: row.recipients,
    },
  });

  return row;
}

export type UpdateActivityInput = {
  orgId: string;
  id: string;
  patch: Partial<Omit<CreateActivityInput, 'orgId' | 'audit'>>;
  audit: AuditContext;
};

export async function updateActivity(input: UpdateActivityInput) {
  const existing = await getActivity(input.orgId, input.id);
  if (!existing) throw new Error('activity_not_found');

  const next = {
    name: input.patch.name ?? existing.name,
    description: input.patch.description ?? existing.description,
    purposeId: input.patch.purposeId === undefined ? existing.purposeId : input.patch.purposeId,
    legalBasis: input.patch.legalBasis ?? existing.legalBasis,
    dataCategories: input.patch.dataCategories ?? existing.dataCategories,
    dataSubjects: input.patch.dataSubjects ?? existing.dataSubjects,
    recipients: input.patch.recipients ?? existing.recipients,
    systemOfRecord: input.patch.systemOfRecord ?? existing.systemOfRecord,
    retentionPeriodMonths:
      input.patch.retentionPeriodMonths ?? existing.retentionPeriodMonths,
    retentionRationale: input.patch.retentionRationale ?? existing.retentionRationale,
    crossBorder:
      input.patch.crossBorder === undefined ? existing.crossBorder : input.patch.crossBorder,
    branchId: input.patch.branchId === undefined ? existing.branchId : input.patch.branchId,
    ownerUserId:
      input.patch.ownerUserId === undefined ? existing.ownerUserId : input.patch.ownerUserId,
    updatedAt: new Date(),
  };

  await db
    .update(processingActivity)
    .set(next)
    .where(eq(processingActivity.id, input.id));

  await appendAudit(input.audit, {
    stream: 'ropa',
    action: 'ropa.updated',
    target: input.id,
    payload: { patchKeys: Object.keys(input.patch) },
  });
}

export async function listActivities(orgId: string) {
  return db
    .select()
    .from(processingActivity)
    .where(eq(processingActivity.orgId, orgId))
    .orderBy(asc(processingActivity.name));
}

export async function listActivitiesWithPurpose(orgId: string) {
  const rows = await db
    .select({
      activity: processingActivity,
      purposeCode: purpose.code,
      purposeName: purpose.name,
    })
    .from(processingActivity)
    .leftJoin(purpose, eq(purpose.id, processingActivity.purposeId))
    .where(eq(processingActivity.orgId, orgId))
    .orderBy(asc(processingActivity.name));
  return rows;
}

export async function getActivity(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(processingActivity)
    .where(and(eq(processingActivity.id, id), eq(processingActivity.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

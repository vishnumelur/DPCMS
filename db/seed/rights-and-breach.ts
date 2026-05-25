import { db } from '@/db/client';
import {
  user,
  dsrRequest,
  dsrEvent,
  slaClock,
  breachIncident,
  breachAction,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { appendAudit } from '@/lib/audit/with-audit';
import { deriveThresholds } from '@/modules/rights/sla';

const ADMIN_USERNAME = 'dpcmsadmin';

/**
 * Seed two sample DSRs (fresh + ~22 days old to demonstrate amber SLA) and
 * one sample breach incident in 'assessing'. Idempotent: keyed on the
 * subject text per principal, and on the breach title.
 */
export async function seedRightsAndBreach(orgId: string) {
  const adminRows = await db.select().from(user).where(eq(user.email, ADMIN_USERNAME)).limit(1);
  const admin = adminRows[0];
  if (!admin) {
    console.log(`Admin user ${ADMIN_USERNAME} missing — skipping rights/breach seed.`);
    return;
  }

  await seedSampleDsrs(orgId, admin.id);
  await seedSampleBreach(orgId, admin.id);
}

const SAMPLE_DSRS = [
  {
    subject: 'Send me a copy of all data you hold',
    kind: 'access' as const,
    details:
      'Please provide a machine-readable export of every record associated with my customer ID for the past 5 years.',
    ageDays: 0,
    targetStatus: 'received' as const,
  },
  {
    subject: 'Correct my registered mobile number',
    kind: 'correction' as const,
    details:
      'My current mobile number on record is outdated. Please update it to the number on file for KYC.',
    ageDays: 22,
    targetStatus: 'in_review' as const,
  },
];

async function seedSampleDsrs(orgId: string, principalUserId: string) {
  for (const sample of SAMPLE_DSRS) {
    const existing = await db
      .select()
      .from(dsrRequest)
      .where(
        and(
          eq(dsrRequest.orgId, orgId),
          eq(dsrRequest.principalUserId, principalUserId),
          eq(dsrRequest.subject, sample.subject),
        ),
      )
      .limit(1);
    if (existing[0]) continue;

    const createdAt = new Date(Date.now() - sample.ageDays * 24 * 60 * 60 * 1000);
    const thresholds = deriveThresholds(createdAt);

    const [row] = await db
      .insert(dsrRequest)
      .values({
        orgId,
        principalUserId,
        kind: sample.kind,
        status: 'received',
        subject: sample.subject,
        details: sample.details,
        slaDueAt: thresholds.thresholdRed,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();
    if (!row) throw new Error(`dsr seed insert failed for ${sample.subject}`);

    await db.insert(slaClock).values({
      orgId,
      requestId: row.id,
      thresholdAmber: thresholds.thresholdAmber,
      thresholdRed: thresholds.thresholdRed,
      state: 'green',
    });

    const auditCreate = await appendAudit(
      { orgId, actorUserId: principalUserId, actorLabel: ADMIN_USERNAME },
      {
        stream: 'dsr',
        action: 'dsr.created',
        target: row.id,
        payload: { kind: sample.kind, subject: sample.subject, seeded: true },
      },
    );
    await db.insert(dsrEvent).values({
      orgId,
      requestId: row.id,
      eventKind: 'state_changed',
      payload: { from: null, to: 'received', kind: sample.kind, seeded: true },
      actorLabel: ADMIN_USERNAME,
      actorUserId: principalUserId,
      rowHash: auditCreate.rowHash,
      createdAt,
    });

    // Walk to in_review for the older sample so the queue shows it amber.
    if (sample.targetStatus === 'in_review') {
      const verifyAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
      const reviewAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);

      await db
        .update(dsrRequest)
        .set({ status: 'identity_verified', updatedAt: verifyAt })
        .where(eq(dsrRequest.id, row.id));
      const auditVerify = await appendAudit(
        { orgId, actorUserId: principalUserId, actorLabel: ADMIN_USERNAME },
        {
          stream: 'dsr',
          action: 'dsr.transitioned',
          target: row.id,
          payload: { from: 'received', to: 'identity_verified', seeded: true },
        },
      );
      await db.insert(dsrEvent).values({
        orgId,
        requestId: row.id,
        eventKind: 'state_changed',
        payload: { from: 'received', to: 'identity_verified', seeded: true },
        actorLabel: ADMIN_USERNAME,
        actorUserId: principalUserId,
        rowHash: auditVerify.rowHash,
        createdAt: verifyAt,
      });

      await db
        .update(dsrRequest)
        .set({ status: 'in_review', updatedAt: reviewAt })
        .where(eq(dsrRequest.id, row.id));
      const auditReview = await appendAudit(
        { orgId, actorUserId: principalUserId, actorLabel: ADMIN_USERNAME },
        {
          stream: 'dsr',
          action: 'dsr.transitioned',
          target: row.id,
          payload: { from: 'identity_verified', to: 'in_review', seeded: true },
        },
      );
      await db.insert(dsrEvent).values({
        orgId,
        requestId: row.id,
        eventKind: 'state_changed',
        payload: { from: 'identity_verified', to: 'in_review', seeded: true },
        actorLabel: ADMIN_USERNAME,
        actorUserId: principalUserId,
        rowHash: auditReview.rowHash,
        createdAt: reviewAt,
      });
    }

    console.log(`Seeded sample DSR "${sample.subject}" (age ${sample.ageDays}d).`);
  }
}

const SAMPLE_BREACH = {
  title: 'Unauthorised access detected on KYC artefact store',
  description:
    'On routine SIEM review, an unusual access pattern was observed from a non-corporate IP against the staging KYC bucket. Investigation underway to determine the scope.',
  severity: 'medium' as const,
  affectedDataCategories: ['identity', 'kyc_artefacts', 'photo'],
  estimatedAffectedCount: 1200,
};

async function seedSampleBreach(orgId: string, declaredByUserId: string) {
  const existing = await db
    .select()
    .from(breachIncident)
    .where(and(eq(breachIncident.orgId, orgId), eq(breachIncident.title, SAMPLE_BREACH.title)))
    .limit(1);
  if (existing[0]) {
    console.log(`Sample breach already exists — skipping breach seed.`);
    return;
  }

  const detectedAt = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
  const deadline = new Date(detectedAt.getTime() + 72 * 60 * 60 * 1000);
  const [incident] = await db
    .insert(breachIncident)
    .values({
      orgId,
      title: SAMPLE_BREACH.title,
      description: SAMPLE_BREACH.description,
      severity: SAMPLE_BREACH.severity,
      status: 'assessing',
      detectedAt,
      reportingDeadlineAt: deadline,
      declaredByUserId,
      affectedDataCategories: SAMPLE_BREACH.affectedDataCategories,
      estimatedAffectedCount: SAMPLE_BREACH.estimatedAffectedCount,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    })
    .returning();
  if (!incident) throw new Error('breach seed insert failed');

  await db.insert(breachAction).values([
    {
      orgId,
      incidentId: incident.id,
      kind: 'detected',
      notes: 'Incident declared by SOC via SIEM alert.',
      actorUserId: declaredByUserId,
      createdAt: detectedAt,
    },
    {
      orgId,
      incidentId: incident.id,
      kind: 'severity_set',
      notes: 'Initial assessment — promoted to medium pending forensic confirmation.',
      actorUserId: declaredByUserId,
      createdAt: new Date(detectedAt.getTime() + 30 * 60 * 1000),
    },
  ]);

  const auditDeclared = await appendAudit(
    { orgId, actorUserId: declaredByUserId, actorLabel: ADMIN_USERNAME },
    {
      stream: 'breach',
      action: 'breach.declared',
      target: incident.id,
      payload: {
        severity: SAMPLE_BREACH.severity,
        title: SAMPLE_BREACH.title,
        seeded: true,
      },
    },
  );
  // We don't insert into a dsr-style ledger; appendAudit alone is enough for breach.
  void auditDeclared;

  console.log(`Seeded sample breach "${SAMPLE_BREACH.title}".`);
}

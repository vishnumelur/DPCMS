import { db } from '@/db/client';
import {
  user,
  purpose,
  processingActivity,
  assessment,
  assessmentResponse,
  assessmentAction,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { appendAudit } from '@/lib/audit/with-audit';
import {
  PIA_TEMPLATE,
  DPIA_TEMPLATE,
  type AssessmentKind,
} from '@/modules/assessment/templates';
import { computeRiskScore } from '@/modules/assessment/scoring';

const ADMIN_USERNAME = 'dpcmsadmin';

type ActivitySeed = {
  name: string;
  description: string;
  purposeCode: string | null;
  legalBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  systemOfRecord: string;
  retentionPeriodMonths: number;
  retentionRationale: string;
  crossBorder: boolean;
};

const ACTIVITIES: readonly ActivitySeed[] = [
  {
    name: 'Customer KYC processing',
    description:
      'Verify and re-verify customer identity using PAN, masked Aadhaar, photograph and DigiLocker artefacts as part of onboarding and periodic re-KYC. Sourced from branches and the digital onboarding journey.',
    purposeCode: 'KYC',
    legalBasis: 'legal_obligation',
    dataCategories: ['contact', 'identity', 'financial'],
    dataSubjects: ['customer'],
    recipients: ['UIDAI', 'DigiLocker'],
    systemOfRecord: 'Finacle',
    retentionPeriodMonths: 60,
    retentionRationale: 'RBI KYC Master Direction §7 — retain 5 years post relationship.',
    crossBorder: false,
  },
  {
    name: 'Marketing email campaigns',
    description:
      'Send promotional emails and newsletters to opted-in customers about new schemes and offers. Delivery is via an external email service provider that sits outside India.',
    purposeCode: 'MARKETING_EMAIL',
    legalBasis: 'consent',
    dataCategories: ['contact', 'behaviour'],
    dataSubjects: ['customer'],
    recipients: ['external_esp'],
    systemOfRecord: 'CRM',
    retentionPeriodMonths: 24,
    retentionRationale: 'Marketing engagement window — 2 years from last interaction.',
    crossBorder: true,
  },
];

const PIA_RESPONSES: Record<string, { answer: string; score: number }> = {
  purpose: {
    answer:
      'Verify customer identity for account opening and periodic re-KYC per RBI Master Direction.',
    score: 2,
  },
  data_categories: {
    answer: 'Identity, contact and financial categories. Sensitive identity numbers are masked at rest.',
    score: 3,
  },
  lawful_basis: { answer: 'Lawful basis: legal_obligation (RBI KYC norms + PMLA 2002).', score: 1 },
  data_subjects: { answer: 'Data subjects: customers and KYC-introducer staff. No minors processed directly.', score: 2 },
  retention: { answer: '60 months post relationship per RBI Master Direction §7.', score: 2 },
  third_party_sharing: {
    answer: 'Shared with UIDAI for Aadhaar masked authentication and with DigiLocker for issued artefacts.',
    score: 3,
  },
};

const DPIA_RESPONSES: Record<string, { answer: string; score: number }> = {
  purpose: { answer: 'Verify customer identity for account opening and periodic re-KYC.', score: 2 },
  data_categories: {
    answer:
      'Identity, contact, financial. Masked Aadhaar handled per UIDAI norms — never stored in plaintext.',
    score: 3,
  },
  lawful_basis: { answer: 'Lawful basis: legal_obligation (RBI KYC + PMLA).', score: 1 },
  data_subjects: {
    answer:
      'Customers and authorised introducer staff. No automated processing of minor cohorts in this activity.',
    score: 2,
  },
  retention: { answer: '60 months post relationship per RBI Master Direction §7.', score: 2 },
  third_party_sharing: {
    answer: 'Shared with UIDAI (Aadhaar authentication) and DigiLocker (artefact retrieval).',
    score: 3,
  },
  automated_decisioning: {
    answer:
      'KYC verification result drives an automated downstream account-opening flow, with mandatory human review for any mismatches.',
    score: 3,
  },
  cross_border_transfer: {
    answer:
      'No cross-border transfer for KYC artefacts — UIDAI and DigiLocker are domestic. Confirmed with vendor list.',
    score: 1,
  },
  contingency_plan: {
    answer:
      'Reference the M9 breach runbook — detect → assess → contain → notify DPB within 72h → notify principals if high-risk.',
    score: 2,
  },
  dpo_consulted: { answer: 'DPO consulted and signed off on the data flow. See assessment ledger.', score: 1 },
};

/**
 * Seed two RoPA entries, a finished PIA on the KYC activity, and an
 * in-review AI-prefilled DPIA on the same. Idempotent — re-runs are safe.
 */
export async function seedAssessmentsP3(orgId: string) {
  const adminRows = await db.select().from(user).where(eq(user.email, ADMIN_USERNAME)).limit(1);
  const admin = adminRows[0];
  if (!admin) {
    console.log(`Admin user ${ADMIN_USERNAME} missing — skipping assessments seed.`);
    return;
  }

  // ─── Activities ──────────────────────────────────────────────────────────
  const purposeRows = await db.select().from(purpose).where(eq(purpose.orgId, orgId));
  const purposeByCode = new Map(purposeRows.map((p) => [p.code, p.id]));

  for (const seed of ACTIVITIES) {
    const existing = await db
      .select()
      .from(processingActivity)
      .where(
        and(eq(processingActivity.orgId, orgId), eq(processingActivity.name, seed.name)),
      )
      .limit(1);
    if (existing[0]) {
      console.log(`Processing activity "${seed.name}" already exists — skipping.`);
      continue;
    }

    const linkedPurposeId = seed.purposeCode ? purposeByCode.get(seed.purposeCode) ?? null : null;

    await db.insert(processingActivity).values({
      orgId,
      name: seed.name,
      description: seed.description,
      purposeId: linkedPurposeId,
      legalBasis: seed.legalBasis,
      dataCategories: seed.dataCategories,
      dataSubjects: seed.dataSubjects,
      recipients: seed.recipients,
      systemOfRecord: seed.systemOfRecord,
      retentionPeriodMonths: seed.retentionPeriodMonths,
      retentionRationale: seed.retentionRationale,
      crossBorder: seed.crossBorder,
      ownerUserId: admin.id,
    });
    console.log(`Seeded processing activity "${seed.name}".`);
  }

  // ─── KYC activity needed for both assessments ─────────────────────────────
  const kycRows = await db
    .select()
    .from(processingActivity)
    .where(
      and(
        eq(processingActivity.orgId, orgId),
        eq(processingActivity.name, 'Customer KYC processing'),
      ),
    )
    .limit(1);
  const kycActivity = kycRows[0];
  if (!kycActivity) return;

  // ─── Sample PIA (approved) ────────────────────────────────────────────────
  await seedAssessment({
    orgId,
    adminId: admin.id,
    activityId: kycActivity.id,
    kind: 'pia',
    title: 'PIA — Customer KYC processing',
    description: 'Routine privacy impact assessment for the customer KYC flow.',
    template: PIA_TEMPLATE,
    responses: PIA_RESPONSES,
    finalStatus: 'approved',
    aiPrefilled: false,
  });

  // ─── Sample DPIA (in_review, AI-prefilled) ───────────────────────────────
  await seedAssessment({
    orgId,
    adminId: admin.id,
    activityId: kycActivity.id,
    kind: 'dpia',
    title: 'DPIA — Customer KYC processing',
    description: 'DPIA for the customer KYC flow — submitted for DPO sign-off.',
    template: DPIA_TEMPLATE,
    responses: DPIA_RESPONSES,
    finalStatus: 'in_review',
    aiPrefilled: true,
  });
}

async function seedAssessment(args: {
  orgId: string;
  adminId: string;
  activityId: string;
  kind: AssessmentKind;
  title: string;
  description: string;
  template: typeof PIA_TEMPLATE | typeof DPIA_TEMPLATE;
  responses: Record<string, { answer: string; score: number }>;
  finalStatus: 'approved' | 'in_review';
  aiPrefilled: boolean;
}) {
  const existing = await db
    .select()
    .from(assessment)
    .where(
      and(
        eq(assessment.orgId, args.orgId),
        eq(assessment.title, args.title),
        eq(assessment.kind, args.kind),
      ),
    )
    .limit(1);
  if (existing[0]) {
    console.log(`Sample ${args.kind.toUpperCase()} "${args.title}" already exists — skipping.`);
    return;
  }

  const scoringInputs = args.template.map((q) => ({
    score: args.responses[q.key]?.score ?? 0,
    weight: q.weight,
  }));
  const { score, level } = computeRiskScore(scoringInputs);

  const [row] = await db
    .insert(assessment)
    .values({
      orgId: args.orgId,
      kind: args.kind,
      title: args.title,
      description: args.description,
      processingActivityId: args.activityId,
      status: args.finalStatus,
      riskScore: score,
      riskLevel: level,
      createdByUserId: args.adminId,
      reviewedByUserId: args.finalStatus === 'approved' ? args.adminId : null,
      aiPrefilled: args.aiPrefilled,
    })
    .returning();
  if (!row) throw new Error(`assessment seed insert failed for ${args.title}`);

  await db.insert(assessmentResponse).values(
    args.template.map((q) => ({
      assessmentId: row.id,
      questionKey: q.key,
      questionLabel: q.label,
      answer: args.responses[q.key]?.answer ?? '',
      weight: q.weight,
      score: args.responses[q.key]?.score ?? 0,
    })),
  );

  const ledger: Array<{ kind: string; notes: string }> = [
    { kind: 'created', notes: `${args.kind.toUpperCase()} created (seed).` },
  ];
  if (args.aiPrefilled) {
    ledger.push({
      kind: 'ai_prefilled',
      notes: `AI prefill (seed) populated ${args.template.length} responses.`,
    });
  }
  ledger.push({ kind: 'submitted', notes: 'Submitted for DPO review (seed).' });
  if (args.finalStatus === 'approved') {
    ledger.push({ kind: 'approved', notes: 'Approved by DPO (seed).' });
  }

  await db.insert(assessmentAction).values(
    ledger.map((l) => ({
      orgId: args.orgId,
      assessmentId: row.id,
      kind: l.kind,
      notes: l.notes,
      actorUserId: args.adminId,
    })),
  );

  await appendAudit(
    { orgId: args.orgId, actorUserId: args.adminId, actorLabel: ADMIN_USERNAME },
    {
      stream: 'assessment',
      action: `assessment.${args.finalStatus === 'approved' ? 'approved' : 'submitted'}`,
      target: row.id,
      payload: { kind: args.kind, title: args.title, seeded: true, riskLevel: level },
    },
  );

  console.log(
    `Seeded ${args.kind.toUpperCase()} "${args.title}" (status=${args.finalStatus}, risk=${level}/${score}).`,
  );
}

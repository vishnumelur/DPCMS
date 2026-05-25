import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { org, branch } from './org';
import { user } from './auth';
import { purpose } from './consent';

/**
 * Records of Processing Activity (RoPA) — an entry per processing activity the
 * data fiduciary undertakes. M3 in the RFP matrix.
 *
 * legalBasis follows the same enum as purpose.lawfulBasis:
 *   'consent' | 'contract' | 'legal_obligation' | 'vital_interest' |
 *   'public_task' | 'legitimate_interest'
 */
export const processingActivity = pgTable(
  'processing_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    purposeId: uuid('purpose_id').references(() => purpose.id, { onDelete: 'set null' }),
    legalBasis: text('legal_basis').notNull().default('consent'),
    dataCategories: text('data_categories').array().notNull().default([]),
    dataSubjects: text('data_subjects').array().notNull().default([]),
    recipients: text('recipients').array().notNull().default([]),
    systemOfRecord: text('system_of_record').notNull().default(''),
    retentionPeriodMonths: integer('retention_period_months').notNull().default(0),
    retentionRationale: text('retention_rationale').notNull().default(''),
    crossBorder: boolean('cross_border').notNull().default(false),
    branchId: uuid('branch_id').references(() => branch.id, { onDelete: 'set null' }),
    ownerUserId: uuid('owner_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgNameIdx: index('processing_activity_org_name_idx').on(t.orgId, t.name),
  }),
);

/**
 * Assessment header — PIA (M6) or DPIA (M7). A single row represents a single
 * assessment instance against one optional processing activity.
 *
 * Allowed kind:      'pia' | 'dpia'
 * Allowed status:    'draft' | 'in_review' | 'approved' | 'rejected'
 * Allowed riskLevel: 'low' | 'medium' | 'high' | 'critical' (nullable)
 *
 * aiPrefilled flags whether the responses on this assessment were initially
 * suggested by the AI gateway, so the UI can surface a badge.
 */
export const assessment = pgTable(
  'assessment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    processingActivityId: uuid('processing_activity_id').references(
      () => processingActivity.id,
      { onDelete: 'set null' },
    ),
    status: text('status').notNull().default('draft'),
    riskScore: integer('risk_score'),
    riskLevel: text('risk_level'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    aiPrefilled: boolean('ai_prefilled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgKindStatusIdx: index('assessment_org_kind_status_idx').on(t.orgId, t.kind, t.status),
  }),
);

/**
 * One response per question on an assessment. questionKey ties the row back to
 * the template question (see modules/assessment/templates.ts). weight and score
 * are duplicated onto the response row so historical scoring is reproducible
 * even after a template is edited.
 */
export const assessmentResponse = pgTable(
  'assessment_response',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessment.id, { onDelete: 'cascade' }),
    questionKey: text('question_key').notNull(),
    questionLabel: text('question_label').notNull(),
    answer: text('answer').notNull().default(''),
    weight: integer('weight').notNull().default(1),
    score: integer('score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    assessmentIdx: index('assessment_response_assessment_idx').on(t.assessmentId, t.questionKey),
  }),
);

/**
 * Append-only ledger of every action taken on an assessment.
 *
 * Allowed kinds: 'created' | 'ai_prefilled' | 'updated' | 'submitted' |
 *                'approved' | 'rejected'
 */
export const assessmentAction = pgTable(
  'assessment_action',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessment.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    notes: text('notes').notNull(),
    actorUserId: uuid('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    assessmentIdx: index('assessment_action_assessment_idx').on(t.assessmentId, t.createdAt),
  }),
);

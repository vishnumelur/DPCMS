import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { org } from './org';
import { user } from './auth';

/**
 * Breach incident — the root entity in the M9 lifecycle.
 *
 * Allowed severities: 'low' | 'medium' | 'high' | 'critical'
 * Allowed statuses:   'detected' | 'assessing' | 'contained' |
 *                     'reported_dpb' | 'closed'
 *
 * reportingDeadlineAt is auto-computed at insert time as detectedAt + 72h
 * per DPDP Rules 2025 (POC default — the actual rule allows shorter
 * timelines for certain severity classes).
 */
export const breachIncident = pgTable(
  'breach_incident',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    severity: text('severity').notNull(),
    status: text('status').notNull().default('detected'),
    detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }),
    reportingDeadlineAt: timestamp('reporting_deadline_at', { withTimezone: true }),
    declaredByUserId: uuid('declared_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    affectedDataCategories: text('affected_data_categories').array().notNull().default([]),
    estimatedAffectedCount: integer('estimated_affected_count').notNull().default(0),
    rootCause: text('root_cause'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgStatusIdx: index('breach_incident_org_status_idx').on(t.orgId, t.status),
  }),
);

/**
 * Append-only ledger of every action taken on a breach incident.
 *
 * Allowed kinds: 'detected' | 'severity_set' | 'contained' | 'dpb_notified' |
 *                'principal_cohort_notified' | 'closed'
 */
export const breachAction = pgTable(
  'breach_action',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    incidentId: uuid('incident_id')
      .notNull()
      .references(() => breachIncident.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    notes: text('notes').notNull(),
    actorUserId: uuid('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    incidentIdx: index('breach_action_incident_idx').on(t.incidentId, t.createdAt),
  }),
);

/**
 * Generated notifications. Whether to the Data Protection Board or to the
 * affected data principals. POC keeps draftMarkdown inline — no PDF / email
 * gateway in P2.
 *
 * Allowed audience: 'dpb' | 'data_principals'
 */
export const breachNotification = pgTable('breach_notification', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => breachIncident.id, { onDelete: 'cascade' }),
  audience: text('audience').notNull(),
  draftMarkdown: text('draft_markdown').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  recipientCohortDescription: text('recipient_cohort_description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Membership of affected data principals (cohort) for a given incident.
 */
export const breachCohort = pgTable('breach_cohort', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => breachIncident.id, { onDelete: 'cascade' }),
  principalUserId: uuid('principal_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

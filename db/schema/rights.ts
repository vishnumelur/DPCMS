import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { org, branch } from './org';
import { user } from './auth';

/**
 * Data Subject Right (DSR) request raised by a data principal. The status
 * column is a plain text rather than enum so future workflow states can be
 * added without a migration of the enum type.
 *
 * Allowed kinds: 'access' | 'correction' | 'erasure' | 'revoke_consent' |
 *                'grievance' | 'nominate'
 * Allowed states: 'received' | 'identity_verified' | 'in_review' |
 *                 'info_requested' | 'fulfilled' | 'rejected' | 'escalated'
 */
export const dsrRequest = pgTable(
  'dsr_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    principalUserId: uuid('principal_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('received'),
    subject: text('subject').notNull(),
    details: text('details').notNull(),
    branchId: uuid('branch_id').references(() => branch.id, { onDelete: 'set null' }),
    assignedToUserId: uuid('assigned_to_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    slaDueAt: timestamp('sla_due_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgPrincipalIdx: index('dsr_request_org_principal_idx').on(t.orgId, t.principalUserId),
    orgStatusIdx: index('dsr_request_org_status_idx').on(t.orgId, t.status),
  }),
);

/**
 * Append-only ledger of every event that occurred on a DSR. Always written
 * alongside an audit_log row; rowHash here is the audit chain row_hash so
 * the two ledgers can be reconciled.
 *
 * Allowed eventKind: 'state_changed' | 'message_added' | 'attachment_added' |
 *                    'sla_breached'
 */
export const dsrEvent = pgTable(
  'dsr_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id')
      .notNull()
      .references(() => dsrRequest.id, { onDelete: 'cascade' }),
    eventKind: text('event_kind').notNull(),
    payload: jsonb('payload').notNull(),
    actorLabel: text('actor_label').notNull(),
    actorUserId: uuid('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    rowHash: text('row_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    requestIdx: index('dsr_event_request_idx').on(t.requestId, t.createdAt),
  }),
);

/**
 * Attachments accepted as inline text (stub for P2). File-blob upload is
 * deferred to P5 — for now the entire body sits in urlOrInlineText.
 */
export const dsrAttachment = pgTable('dsr_attachment', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id')
    .notNull()
    .references(() => dsrRequest.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  urlOrInlineText: text('url_or_inline_text').notNull(),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Computed SLA clock per DSR. lastEvaluatedAt is updated on every status
 * change; `state` is recomputed live in queue UIs because Hobby tier has no
 * sub-day cron.
 *
 * Allowed states: 'green' | 'amber' | 'red'
 */
export const slaClock = pgTable('sla_clock', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id')
    .notNull()
    .references(() => dsrRequest.id, { onDelete: 'cascade' }),
  thresholdAmber: timestamp('threshold_amber', { withTimezone: true }).notNull(),
  thresholdRed: timestamp('threshold_red', { withTimezone: true }).notNull(),
  state: text('state').notNull().default('green'),
  lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }).defaultNow().notNull(),
});

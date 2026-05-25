import { pgTable, uuid, text, timestamp, jsonb, index, bigint } from 'drizzle-orm/pg-core';
import { org } from './org';
import { user } from './auth';

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    stream: text('stream').notNull(),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
    actorUserId: uuid('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    actorLabel: text('actor_label').notNull(),
    action: text('action').notNull(),
    target: text('target').notNull(),
    payload: jsonb('payload').notNull(),
    prevHash: text('prev_hash').notNull(),
    rowHash: text('row_hash').notNull(),
  },
  (t) => ({
    orgStreamSeqIdx: index('audit_log_org_stream_seq_idx').on(t.orgId, t.stream, t.seq),
  }),
);

export const auditChainHead = pgTable(
  'audit_chain_head',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    stream: text('stream').notNull(),
    lastSeq: bigint('last_seq', { mode: 'number' }).notNull().default(0),
    lastHash: text('last_hash').notNull().default('GENESIS'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: index('audit_chain_head_pk').on(t.orgId, t.stream),
  }),
);

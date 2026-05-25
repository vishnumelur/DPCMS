import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { org } from './org';

export const appKeys = pgTable('app_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  kid: text('kid').notNull(),
  publicPem: text('public_pem').notNull(),
  privatePemEncrypted: text('private_pem_encrypted').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const featureFlag = pgTable('feature_flag', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => org.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  enabled: integer('enabled').notNull().default(0),
});

export const i18nString = pgTable('i18n_string', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => org.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  namespace: text('namespace').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  reviewed: integer('reviewed').notNull().default(0),
});

export const aiCallLog = pgTable('ai_call_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
  model: text('model').notNull(),
  promptRedacted: jsonb('prompt_redacted').notNull(),
  responseRedacted: jsonb('response_redacted').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  purpose: text('purpose').notNull(),
});

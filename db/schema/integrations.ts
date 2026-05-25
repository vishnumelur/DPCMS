import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { org } from './org';
import { user } from './auth';

/**
 * A configured external connector — CBS (Finacle), NPCI (UPI/AEPS/BBPS),
 * Aadhaar e-KYC, DigiLocker, Account Aggregator, MeitY consent stack.
 *
 * Allowed kind:       'cbs' | 'payments' | 'identity' | 'document' |
 *                     'consent_aggregator'
 * Allowed mode:       'mock' | 'sandbox' | 'live'
 * Allowed healthState:'green' | 'amber' | 'red'
 *
 * configJson is an opaque blob the connector implementation reads from:
 *   { baseUrl, apiKeyRef, mockSeed, ... }
 */
export const connector = pgTable(
  'connector',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    mode: text('mode').notNull().default('mock'),
    enabled: boolean('enabled').notNull().default(true),
    healthState: text('health_state').notNull().default('green'),
    lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),
    configJson: jsonb('config_json').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgCodeUx: uniqueIndex('connector_org_code_ux').on(t.orgId, t.code),
  }),
);

/**
 * Append-only event log for every connector interaction (health checks,
 * outbound triggers, inbound notifications). Payload is already PII-redacted
 * via lib/ai/redact.ts before persistence.
 *
 * Allowed direction: 'inbound' | 'outbound'
 */
export const connectorEvent = pgTable(
  'connector_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    connectorId: uuid('connector_id')
      .notNull()
      .references(() => connector.id, { onDelete: 'cascade' }),
    direction: text('direction').notNull(),
    eventKind: text('event_kind').notNull(),
    payloadRedacted: jsonb('payload_redacted').notNull().default({}),
    statusCode: integer('status_code'),
    latencyMs: integer('latency_ms'),
    errorMessage: text('error_message'),
    correlationId: text('correlation_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    connectorIdx: index('connector_event_connector_idx').on(t.connectorId, t.createdAt),
    orgIdx: index('connector_event_org_idx').on(t.orgId, t.createdAt),
  }),
);

/**
 * Per-connector consent enforcement check — recorded when an operator (or
 * downstream call) asks 'may this connector use this purpose for this
 * principal?'. Append-only.
 *
 * Allowed decision: 'allow' | 'deny'
 */
export const consentEnforcementCheck = pgTable(
  'consent_enforcement_check',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    connectorId: uuid('connector_id')
      .notNull()
      .references(() => connector.id, { onDelete: 'cascade' }),
    principalUserId: uuid('principal_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    purposeCode: text('purpose_code').notNull(),
    decision: text('decision').notNull(),
    reason: text('reason').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    connectorIdx: index('consent_enforcement_check_connector_idx').on(t.connectorId, t.createdAt),
  }),
);

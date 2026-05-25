import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { org } from './org';
import { user } from './auth';

/**
 * Purposes are scoped per-org and identified by a stable code
 * (e.g. ACCOUNT_OPENING, KYC, MARKETING_EMAIL).
 *
 * lawfulBasis is stored as plain text rather than a pg enum so adding new
 * bases later does not require a migration of the enum type. Allowed values:
 *   'consent' | 'contract' | 'legal_obligation' | 'vital_interest' |
 *   'public_task' | 'legitimate_interest'
 */
export const purpose = pgTable(
  'purpose',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    lawfulBasis: text('lawful_basis').notNull().default('consent'),
    dataCategories: text('data_categories').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgCodeUx: uniqueIndex('purpose_org_code_ux').on(t.orgId, t.code),
  }),
);

/**
 * Markdown body of the consent presented to a data principal. Versioned per
 * (purpose, language) — superseding versions live alongside the older ones for
 * full reproducibility of artefacts that reference them.
 */
export const consentTemplate = pgTable(
  'consent_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    purposeId: uuid('purpose_id')
      .notNull()
      .references(() => purpose.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    bodyMarkdown: text('body_markdown').notNull(),
    languageCode: text('language_code').notNull().default('en'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    purposeVersionLangUx: uniqueIndex('consent_template_purpose_version_lang_ux').on(
      t.purposeId,
      t.version,
      t.languageCode,
    ),
  }),
);

/**
 * Append-only ledger of consent artefacts. A new row is inserted on every
 * grant / withdrawal / renewal. prevArtefactId stitches the events for a
 * (principal, purpose) tuple into a self-referencing linked list so the chain
 * of events is reconstructable even outside the audit log.
 *
 * The jws + bodyHash columns hold the DEPA-style signed body (RS256), so the
 * row is admissible evidence on its own.
 */
export const consentArtefact = pgTable(
  'consent_artefact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    principalUserId: uuid('principal_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    purposeId: uuid('purpose_id')
      .notNull()
      .references(() => purpose.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => consentTemplate.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull(), // 'granted' | 'withdrawn' | 'renewed'
    prevArtefactId: uuid('prev_artefact_id'),
    jws: text('jws').notNull(),
    bodyHash: text('body_hash').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgPrincipalPurposeIdx: index('consent_artefact_org_principal_purpose_idx').on(
      t.orgId,
      t.principalUserId,
      t.purposeId,
    ),
  }),
);

/**
 * Materialised current consent status per (principal, purpose). Reflects the
 * effect of the latest artefact in the append-only ledger.
 */
export const consentPreference = pgTable(
  'consent_preference',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    principalUserId: uuid('principal_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    purposeId: uuid('purpose_id')
      .notNull()
      .references(() => purpose.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'), // 'active' | 'withdrawn' | 'expired'
    currentArtefactId: uuid('current_artefact_id')
      .notNull()
      .references(() => consentArtefact.id, { onDelete: 'restrict' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    principalPurposeUx: uniqueIndex('consent_preference_principal_purpose_ux').on(
      t.principalUserId,
      t.purposeId,
    ),
  }),
);

/**
 * Privacy notices (public, versioned per language).
 */
export const notice = pgTable(
  'notice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    languageCode: text('language_code').notNull().default('en'),
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgSlugVersionLangUx: uniqueIndex('notice_org_slug_version_lang_ux').on(
      t.orgId,
      t.slug,
      t.version,
      t.languageCode,
    ),
  }),
);

/** Append-only ledger of notice acknowledgements. */
export const noticeAck = pgTable(
  'notice_ack',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    principalUserId: uuid('principal_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    noticeId: uuid('notice_id')
      .notNull()
      .references(() => notice.id, { onDelete: 'cascade' }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    principalNoticeIdx: index('notice_ack_principal_notice_idx').on(t.principalUserId, t.noticeId),
  }),
);

/**
 * Per-language translation of a notice's body. Inserted on demand by the
 * "Generate translations" action (via Gemini or deterministic fallback);
 * flipped to reviewed=true when a DPO signs off. Customer-facing pages
 * render the translated body when their locale matches a reviewed row, else
 * fall back to the English original with a "translation pending" notice.
 */
export const noticeTranslation = pgTable(
  'notice_translation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    noticeId: uuid('notice_id')
      .notNull()
      .references(() => notice.id, { onDelete: 'cascade' }),
    languageCode: text('language_code').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    source: text('source').notNull().default('ai'), // 'ai' | 'fallback' | 'human'
    reviewed: boolean('reviewed').notNull().default(false),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    noticeLangUx: uniqueIndex('notice_translation_notice_lang_ux').on(t.noticeId, t.languageCode),
  }),
);

/** Cookie categories ('essential', 'functional', 'analytics', 'marketing'). */
export const cookieCategory = pgTable(
  'cookie_category',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isEssential: boolean('is_essential').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgKeyUx: uniqueIndex('cookie_category_org_key_ux').on(t.orgId, t.key),
  }),
);

/** Append-only ledger of cookie consent decisions (anonymous or attributed). */
export const cookieConsentRecord = pgTable('cookie_consent_record', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => org.id, { onDelete: 'cascade' }),
  principalUserId: uuid('principal_user_id').references(() => user.id, { onDelete: 'set null' }),
  sessionId: text('session_id').notNull(),
  categoriesAccepted: text('categories_accepted').array().notNull().default([]),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

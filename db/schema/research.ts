import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { org } from './org';
import { user } from './auth';

/**
 * A canonical data-protection law (Act, Rule, Regulation, etc.).
 * `code` is the stable client-facing identifier used in URLs
 * (e.g. 'DPDP_2023', 'DPDP_RULES_2025', 'GDPR_EU_2018').
 */
export const lawDocument = pgTable(
  'law_document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    jurisdiction: text('jurisdiction').notNull(),
    effectiveFrom: date('effective_from'),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    jurisdictionIdx: index('law_document_jurisdiction_idx').on(t.jurisdiction),
  }),
);

/**
 * A section/clause within a law document. `sectionNumber` is the canonical
 * citation token (e.g. '3', '5(1)(a)', 'Art. 17').
 */
export const lawSection = pgTable(
  'law_section',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => lawDocument.id, { onDelete: 'cascade' }),
    sectionNumber: text('section_number').notNull(),
    title: text('title').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    tags: text('tags').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    docSectionUx: uniqueIndex('law_section_doc_section_ux').on(
      t.documentId,
      t.sectionNumber,
    ),
  }),
);

/**
 * Data-principal nomination per DPDP Act §14. Lets a principal nominate
 * another individual to exercise rights on their behalf.
 *
 * Allowed verificationStatus: 'pending' | 'verified' | 'rejected'
 * Allowed permissions:        'view' | 'withdraw' | 'erase'
 */
export const nominee = pgTable(
  'nominee',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    principalUserId: uuid('principal_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    relation: text('relation').notNull(),
    permissions: text('permissions').array().notNull().default([]),
    verificationStatus: text('verification_status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    principalIdx: index('nominee_principal_idx').on(t.principalUserId),
  }),
);

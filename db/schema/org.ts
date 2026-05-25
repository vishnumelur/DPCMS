import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';

export const branchKindEnum = pgEnum('branch_kind', ['region', 'zone', 'branch']);

export const org = pgTable('org', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  signingKid: text('signing_kid').notNull(),
  saltHex: text('salt_hex').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const branch = pgTable(
  'branch',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    kind: branchKindEnum('kind').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ orgCodeIdx: index('branch_org_code_idx').on(t.orgId, t.code) }),
);

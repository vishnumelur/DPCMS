import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { org, branch } from './org';

export const roleKindEnum = pgEnum('role_kind', [
  'dpo',
  'privacy_steward',
  'branch_user',
  'auditor',
  'it_admin',
  'board',
  'customer',
]);

export const scopeKindEnum = pgEnum('scope_kind', ['global', 'region', 'zone', 'branch']);

// --- Auth.js v5 tables ---
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => org.id, { onDelete: 'cascade' }),
  name: text('name'),
  // `email` doubles as the login identifier; for the admin seed it holds 'dpcmsadmin'
  // (not RFC-5322), which Postgres accepts as plain text.
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  // Nullable: only set for credential-login users; magic-link users leave it NULL.
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const account = pgTable(
  'account',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const session = pgTable('session', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationToken = pgTable(
  'verification_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

// --- RBAC ---
export const role = pgTable(
  'role',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    kind: roleKindEnum('kind').notNull(),
    description: text('description'),
  },
  (t) => ({ orgKindIdx: index('role_org_kind_idx').on(t.orgId, t.kind) }),
);

export const permission = pgTable('permission', {
  id: uuid('id').primaryKey().defaultRandom(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  description: text('description'),
});

export const rolePermission = pgTable(
  'role_permission',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }),
);

export const userRole = pgTable('user_role', {
  // Synthetic PK so branch_id can stay nullable (global scope).
  // Uniqueness across (user_id, role_id, scope_kind, branch_id) is enforced by
  // two partial indexes added in the manual SQL block below.
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id')
    .notNull()
    .references(() => role.id, { onDelete: 'cascade' }),
  scopeKind: scopeKindEnum('scope_kind').notNull().default('global'),
  branchId: uuid('branch_id').references(() => branch.id, { onDelete: 'cascade' }),
});

// --- MFA ---
export const mfaFactor = pgTable('mfa_factor', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull().default('totp'),
  secretEncrypted: text('secret_encrypted').notNull(),
  confirmed: boolean('confirmed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});

import { db } from '@/db/client';
import { org, branch, role, permission, rolePermission, user, userRole } from '@/db/schema';
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, type RoleKind } from '@/lib/auth/rbac';
import { and, eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';

const ADMIN_USERNAME = 'dpcmsadmin';
const ADMIN_PASSWORD = 'dpcms@2026';

export async function seedOrgAndRoles() {
  const existing = await db.select().from(org).where(eq(org.slug, env.SEED_ORG_SLUG)).limit(1);
  let orgRow = existing[0] ?? null;

  if (!orgRow) {
    const [createdOrg] = await db
      .insert(org)
      .values({
        name: env.SEED_ORG_NAME,
        slug: env.SEED_ORG_SLUG,
        signingKid: `${env.SEED_ORG_SLUG}-${Date.now()}`,
        saltHex: randomBytes(16).toString('hex'),
      })
      .returning();
    if (!createdOrg) throw new Error('Failed to seed org');
    orgRow = createdOrg;

    await db.insert(branch).values([
      { orgId: orgRow.id, kind: 'region', code: 'KER-N', name: 'North Kerala' },
      { orgId: orgRow.id, kind: 'region', code: 'KER-S', name: 'South Kerala' },
      { orgId: orgRow.id, kind: 'branch', code: 'TVM-MAIN', name: 'Trivandrum Main' },
    ]);

    const permRows = await db
      .insert(permission)
      .values(ALL_PERMISSIONS.map((p) => ({ resource: p.resource, action: p.action })))
      .returning();
    const permIndex = new Map(permRows.map((p) => [`${p.resource}:${p.action}`, p.id]));

    for (const kind of Object.keys(ROLE_PERMISSIONS) as RoleKind[]) {
      const [createdRole] = await db
        .insert(role)
        .values({ orgId: orgRow.id, kind, description: `${kind} role for ${orgRow.name}` })
        .returning();
      if (!createdRole) throw new Error(`Failed to seed role ${kind}`);
      const links = ROLE_PERMISSIONS[kind].map((p) => {
        const pid = permIndex.get(`${p.resource}:${p.action}`);
        if (!pid) throw new Error(`Unknown permission ${p.resource}:${p.action}`);
        return { roleId: createdRole.id, permissionId: pid };
      });
      if (links.length) await db.insert(rolePermission).values(links);
    }

    console.log(`Seeded org ${orgRow.name} with branches + roles + permissions.`);
  } else {
    console.log(`Org ${env.SEED_ORG_SLUG} already exists — skipping org/branch/role seed.`);
  }

  await seedAdminUser(orgRow.id);
  return orgRow;
}

async function seedAdminUser(orgId: string) {
  const existing = await db.select().from(user).where(eq(user.email, ADMIN_USERNAME)).limit(1);
  const passwordHash = await hash(ADMIN_PASSWORD, 10);

  let adminId: string;
  if (existing[0]) {
    // Rotate the password every seed run so the documented credential always works.
    await db.update(user).set({ passwordHash }).where(eq(user.id, existing[0].id));
    adminId = existing[0].id;
    console.log(`Admin user ${ADMIN_USERNAME} already exists — password refreshed.`);
  } else {
    const [created] = await db
      .insert(user)
      .values({
        orgId,
        email: ADMIN_USERNAME,
        name: 'DPCMS Administrator',
        passwordHash,
        emailVerified: new Date(),
      })
      .returning();
    if (!created) throw new Error('Failed to seed admin user');
    adminId = created.id;
    console.log(`Seeded admin user ${ADMIN_USERNAME}.`);
  }

  // Assign DPO role (full permissions) to the admin user.
  const dpoRoleRows = await db
    .select()
    .from(role)
    .where(and(eq(role.orgId, orgId), eq(role.kind, 'dpo')))
    .limit(1);
  const dpoRole = dpoRoleRows[0];
  if (!dpoRole) throw new Error('DPO role not found — was the org seed skipped on first run?');

  const linkExists = await db
    .select()
    .from(userRole)
    .where(and(eq(userRole.userId, adminId), eq(userRole.roleId, dpoRole.id)))
    .limit(1);

  if (!linkExists[0]) {
    await db.insert(userRole).values({
      userId: adminId,
      roleId: dpoRole.id,
      scopeKind: 'global',
      branchId: null,
    });
    console.log(`Linked ${ADMIN_USERNAME} → DPO role (global scope).`);
  }
}

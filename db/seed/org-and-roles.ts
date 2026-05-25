import { db } from '@/db/client';
import { org, branch, role, permission, rolePermission } from '@/db/schema';
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, type RoleKind } from '@/lib/auth/rbac';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { randomBytes } from 'node:crypto';

export async function seedOrgAndRoles() {
  const existing = await db.select().from(org).where(eq(org.slug, env.SEED_ORG_SLUG)).limit(1);
  if (existing[0]) {
    console.log(`Org ${env.SEED_ORG_SLUG} already seeded — skipping.`);
    return existing[0];
  }

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

  await db.insert(branch).values([
    { orgId: createdOrg.id, kind: 'region', code: 'KER-N', name: 'North Kerala' },
    { orgId: createdOrg.id, kind: 'region', code: 'KER-S', name: 'South Kerala' },
    { orgId: createdOrg.id, kind: 'branch', code: 'TVM-MAIN', name: 'Trivandrum Main' },
  ]);

  const permRows = await db
    .insert(permission)
    .values(ALL_PERMISSIONS.map((p) => ({ resource: p.resource, action: p.action })))
    .returning();
  const permIndex = new Map(permRows.map((p) => [`${p.resource}:${p.action}`, p.id]));

  for (const kind of Object.keys(ROLE_PERMISSIONS) as RoleKind[]) {
    const [createdRole] = await db
      .insert(role)
      .values({ orgId: createdOrg.id, kind, description: `${kind} role for ${createdOrg.name}` })
      .returning();
    if (!createdRole) throw new Error(`Failed to seed role ${kind}`);
    const links = ROLE_PERMISSIONS[kind].map((p) => {
      const pid = permIndex.get(`${p.resource}:${p.action}`);
      if (!pid) throw new Error(`Unknown permission ${p.resource}:${p.action}`);
      return { roleId: createdRole.id, permissionId: pid };
    });
    if (links.length) await db.insert(rolePermission).values(links);
  }

  console.log(`Seeded org ${createdOrg.name} with branches + roles + permissions.`);
  return createdOrg;
}

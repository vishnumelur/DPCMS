import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, userRole, role } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { RoleKind } from '@/lib/auth/rbac';

export type ActorContext = {
  actorUserId: string;
  orgId: string;
  actorLabel: string;
  roles: ReadonlyArray<RoleKind>;
};

/**
 * Resolve the authenticated user, their org, and every role kind they hold.
 * Throws if the request is unauthenticated or the user has no org.
 */
export async function getActor(): Promise<ActorContext> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error('not_authenticated');

  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u || !u.orgId) throw new Error('user_has_no_org');

  const links = await db.select().from(userRole).where(eq(userRole.userId, u.id));
  const roleIds = links.map((l) => l.roleId);
  const roleRows = roleIds.length
    ? await db.select().from(role).where(eq(role.orgId, u.orgId))
    : [];
  const roleKinds = roleRows
    .filter((r) => roleIds.includes(r.id))
    .map((r) => r.kind as RoleKind);

  return {
    actorUserId: u.id,
    orgId: u.orgId,
    actorLabel: email,
    roles: roleKinds.length ? roleKinds : (['customer'] as RoleKind[]),
  };
}

export function hasAnyRole(roles: ReadonlyArray<RoleKind>, want: ReadonlyArray<RoleKind>): boolean {
  return roles.some((r) => want.includes(r));
}

export function primaryAdminRole(roles: ReadonlyArray<RoleKind>): RoleKind {
  // Pick the highest-privilege role we hold. Used for workflow guard evaluation.
  const priority: RoleKind[] = [
    'dpo',
    'privacy_steward',
    'it_admin',
    'auditor',
    'branch_user',
    'board',
    'customer',
  ];
  for (const p of priority) if (roles.includes(p)) return p;
  return 'customer';
}

import { db } from '@/db/client';
import { role, permission, rolePermission, user, userRole } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function AdminRbacPage() {
  const [roles, perms, links, users, userRoles] = await Promise.all([
    db.select().from(role),
    db.select().from(permission),
    db.select().from(rolePermission),
    db.select().from(user),
    db.select().from(userRole),
  ]);

  // Build role → permissions[] map
  const roleToPerms = new Map<string, string[]>();
  for (const link of links) {
    const perm = perms.find((p) => p.id === link.permissionId);
    if (!perm) continue;
    const list = roleToPerms.get(link.roleId) ?? [];
    list.push(`${perm.resource}:${perm.action}`);
    roleToPerms.set(link.roleId, list);
  }

  // Build user → roles[] map
  const userToRoles = new Map<string, { roleKind: string; scope: string }[]>();
  for (const ur of userRoles) {
    const r = roles.find((x) => x.id === ur.roleId);
    const u = users.find((x) => x.id === ur.userId);
    if (!r || !u) continue;
    const list = userToRoles.get(u.id) ?? [];
    list.push({ roleKind: r.kind, scope: ur.scopeKind });
    userToRoles.set(u.id, list);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">RBAC viewer</h1>
          <p className="text-sm text-muted-foreground">
            Roles, permissions, and user assignments — seeded in P0; editor UI lands in P5.
          </p>
        </div>
        <Badge variant="default">Live · P0</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles ({roles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => {
                  const rp = roleToPerms.get(r.id) ?? [];
                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-2 pr-4 font-mono text-xs">{r.kind}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.description ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {rp.length === 0 ? (
                            <span className="text-xs text-muted-foreground">— none —</span>
                          ) : (
                            rp.map((p) => (
                              <code key={p} className="rounded bg-muted px-2 py-0.5 text-[10px]">{p}</code>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({users.length}) and their roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Roles</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const ur = userToRoles.get(u.id) ?? [];
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {ur.length === 0 ? (
                            <span className="text-xs text-muted-foreground">— none —</span>
                          ) : (
                            ur.map((x, i) => (
                              <Badge key={`${u.id}-${i}`} variant="secondary" className="text-[10px]">
                                {x.roleKind} · {x.scope}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type ScopeKind = 'global' | 'region' | 'zone' | 'branch';
export type UserScope = { scopeKind: ScopeKind; branchId: string | null };
export type ScopedUser = { orgId: string; scopes: UserScope[] };

export type ScopeFilter =
  | { orgId: string; branchIds: '*' }
  | { orgId: string; branchIds: string[] };

export function scopeFilter(u: ScopedUser): ScopeFilter {
  if (u.scopes.some((s) => s.scopeKind === 'global')) {
    return { orgId: u.orgId, branchIds: '*' };
  }
  const ids = u.scopes
    .filter((s) => s.branchId !== null)
    .map((s) => s.branchId as string);
  return { orgId: u.orgId, branchIds: ids };
}

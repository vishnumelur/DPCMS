import { describe, it, expect } from 'vitest';
import { scopeFilter, type ScopedUser } from './scope';

describe('scope', () => {
  it('global scope allows all branches', () => {
    const u: ScopedUser = { orgId: 'org-1', scopes: [{ scopeKind: 'global', branchId: null }] };
    expect(scopeFilter(u)).toEqual({ orgId: 'org-1', branchIds: '*' });
  });

  it('branch-only scope restricts to listed branches', () => {
    const u: ScopedUser = {
      orgId: 'org-1',
      scopes: [
        { scopeKind: 'branch', branchId: 'br-A' },
        { scopeKind: 'branch', branchId: 'br-B' },
      ],
    };
    expect(scopeFilter(u)).toEqual({ orgId: 'org-1', branchIds: ['br-A', 'br-B'] });
  });

  it('no scopes => empty allow list', () => {
    const u: ScopedUser = { orgId: 'org-1', scopes: [] };
    expect(scopeFilter(u)).toEqual({ orgId: 'org-1', branchIds: [] });
  });
});

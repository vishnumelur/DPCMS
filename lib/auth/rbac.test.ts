import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, can, ALL_PERMISSIONS } from './rbac';

describe('rbac', () => {
  it('dpo has every permission', () => {
    for (const p of ALL_PERMISSIONS) {
      expect(can({ kind: 'dpo' }, p.resource, p.action)).toBe(true);
    }
  });

  it('customer cannot read dsr queue', () => {
    expect(can({ kind: 'customer' }, 'dsr', 'read.queue')).toBe(false);
  });

  it('auditor can read audit chain but not write', () => {
    expect(can({ kind: 'auditor' }, 'audit', 'read')).toBe(true);
    expect(can({ kind: 'auditor' }, 'audit', 'write')).toBe(false);
  });

  it('all role kinds appear in ROLE_PERMISSIONS', () => {
    const kinds = ['dpo', 'privacy_steward', 'branch_user', 'auditor', 'it_admin', 'board', 'customer'];
    for (const k of kinds) expect(ROLE_PERMISSIONS[k as keyof typeof ROLE_PERMISSIONS]).toBeDefined();
  });
});

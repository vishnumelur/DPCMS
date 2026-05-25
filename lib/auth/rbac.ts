export type RoleKind =
  | 'dpo'
  | 'privacy_steward'
  | 'branch_user'
  | 'auditor'
  | 'it_admin'
  | 'board'
  | 'customer';

export type Permission = { resource: string; action: string };

// Resource/action catalogue (extends in later phases).
export const ALL_PERMISSIONS: readonly Permission[] = [
  { resource: 'audit', action: 'read' },
  { resource: 'audit', action: 'write' },
  { resource: 'dsr', action: 'read.queue' },
  { resource: 'dsr', action: 'read.own' },
  { resource: 'dsr', action: 'create' },
  { resource: 'dsr', action: 'approve' },
  { resource: 'consent', action: 'read' },
  { resource: 'consent', action: 'grant' },
  { resource: 'consent', action: 'withdraw' },
  { resource: 'breach', action: 'read' },
  { resource: 'breach', action: 'declare' },
  { resource: 'breach', action: 'approve' },
  { resource: 'connector', action: 'read' },
  { resource: 'connector', action: 'configure' },
  { resource: 'rbac', action: 'manage' },
  { resource: 'rfp', action: 'read' },
  { resource: 'reports', action: 'read.board' },
] as const;

const ALL = ALL_PERMISSIONS;
const ofResource = (r: string) => ALL.filter((p) => p.resource === r);

export const ROLE_PERMISSIONS: Record<RoleKind, readonly Permission[]> = {
  dpo: ALL,
  privacy_steward: [
    ...ofResource('dsr'),
    ...ofResource('consent'),
    ...ofResource('breach').filter((p) => p.action !== 'approve'),
    { resource: 'audit', action: 'read' },
    { resource: 'rfp', action: 'read' },
  ],
  branch_user: [
    { resource: 'dsr', action: 'read.queue' },
    { resource: 'dsr', action: 'create' },
    { resource: 'consent', action: 'read' },
    { resource: 'rfp', action: 'read' },
  ],
  auditor: [
    { resource: 'audit', action: 'read' },
    { resource: 'dsr', action: 'read.queue' },
    { resource: 'consent', action: 'read' },
    { resource: 'breach', action: 'read' },
    { resource: 'rfp', action: 'read' },
  ],
  it_admin: [
    ...ofResource('connector'),
    { resource: 'rbac', action: 'manage' },
    { resource: 'audit', action: 'read' },
    { resource: 'rfp', action: 'read' },
  ],
  board: [
    { resource: 'reports', action: 'read.board' },
    { resource: 'rfp', action: 'read' },
  ],
  customer: [
    { resource: 'dsr', action: 'read.own' },
    { resource: 'dsr', action: 'create' },
    { resource: 'consent', action: 'grant' },
    { resource: 'consent', action: 'withdraw' },
  ],
};

export type Principal = { kind: RoleKind };

export function can(p: Principal, resource: string, action: string): boolean {
  return ROLE_PERMISSIONS[p.kind].some((x) => x.resource === resource && x.action === action);
}

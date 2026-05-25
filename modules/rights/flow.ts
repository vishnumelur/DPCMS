import { defineFlow, type Flow } from '@/lib/workflow/engine';
import type { RoleKind } from '@/lib/auth/rbac';

export type DsrState =
  | 'received'
  | 'identity_verified'
  | 'in_review'
  | 'info_requested'
  | 'fulfilled'
  | 'rejected'
  | 'escalated';

export type DsrEventName =
  | 'VERIFY_IDENTITY'
  | 'START_REVIEW'
  | 'REQUEST_INFO'
  | 'INFO_RECEIVED'
  | 'FULFILL'
  | 'REJECT'
  | 'ESCALATE';

export type DsrGuardCtx = { role: RoleKind };

const dpoOrSteward = ({ role }: DsrGuardCtx) =>
  role === 'dpo' || role === 'privacy_steward';

/**
 * RECEIVED → IDENTITY_VERIFIED → IN_REVIEW
 *                                  ↘ INFO_REQUESTED → IN_REVIEW
 *                                  ↘ FULFILLED | REJECTED | ESCALATED
 *
 * Guards: only `dpo` or `privacy_steward` may advance state.
 */
export const dsrFlow: Flow<DsrState, DsrEventName, DsrGuardCtx> = defineFlow({
  initial: 'received',
  transitions: [
    { from: 'received',          on: 'VERIFY_IDENTITY', to: 'identity_verified', guard: dpoOrSteward },
    { from: 'identity_verified', on: 'START_REVIEW',    to: 'in_review',         guard: dpoOrSteward },
    { from: 'in_review',         on: 'REQUEST_INFO',    to: 'info_requested',    guard: dpoOrSteward },
    { from: 'info_requested',    on: 'INFO_RECEIVED',   to: 'in_review',         guard: dpoOrSteward },
    { from: 'in_review',         on: 'FULFILL',         to: 'fulfilled',         guard: dpoOrSteward },
    { from: 'in_review',         on: 'REJECT',          to: 'rejected',          guard: dpoOrSteward },
    { from: 'in_review',         on: 'ESCALATE',        to: 'escalated',         guard: dpoOrSteward },
    // From info_requested it's also legal to terminally close (operator overrides).
    { from: 'info_requested',    on: 'FULFILL',         to: 'fulfilled',         guard: dpoOrSteward },
    { from: 'info_requested',    on: 'REJECT',          to: 'rejected',          guard: dpoOrSteward },
    { from: 'info_requested',    on: 'ESCALATE',        to: 'escalated',         guard: dpoOrSteward },
  ],
});

export const DSR_EVENT_LABELS: Record<DsrEventName, string> = {
  VERIFY_IDENTITY: 'Verify identity',
  START_REVIEW:    'Start review',
  REQUEST_INFO:    'Request more info',
  INFO_RECEIVED:   'Mark info received',
  FULFILL:         'Fulfil',
  REJECT:          'Reject',
  ESCALATE:        'Escalate',
};

export const TERMINAL_STATES: ReadonlySet<DsrState> = new Set([
  'fulfilled',
  'rejected',
  'escalated',
]);

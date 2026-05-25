/**
 * SLA state computation.
 *
 * DPDP Act defaults:
 *  - amber threshold: createdAt + 21 days  (warning band starts)
 *  - red threshold:   createdAt + 30 days  (statutory breach)
 *
 * Hobby tier has no sub-day cron, so we recompute on-read in queue UIs
 * instead of nightly batches.
 */
export type SlaInputs = {
  thresholdAmber: Date;
  thresholdRed: Date;
};

export type SlaState = 'green' | 'amber' | 'red';

export function computeSlaState(inputs: SlaInputs, now: Date = new Date()): SlaState {
  const t = now.getTime();
  if (t >= inputs.thresholdRed.getTime()) return 'red';
  if (t >= inputs.thresholdAmber.getTime()) return 'amber';
  return 'green';
}

export const DSR_AMBER_DAYS = 21;
export const DSR_RED_DAYS = 30;

export function deriveThresholds(createdAt: Date): SlaInputs {
  const amber = new Date(createdAt.getTime() + DSR_AMBER_DAYS * 24 * 60 * 60 * 1000);
  const red = new Date(createdAt.getTime() + DSR_RED_DAYS * 24 * 60 * 60 * 1000);
  return { thresholdAmber: amber, thresholdRed: red };
}

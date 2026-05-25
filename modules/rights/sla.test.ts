import { describe, it, expect } from 'vitest';
import { computeSlaState, deriveThresholds, DSR_AMBER_DAYS, DSR_RED_DAYS } from './sla';

const day = 24 * 60 * 60 * 1000;

describe('computeSlaState', () => {
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const thresholds = deriveThresholds(createdAt);

  it('returns green within the first 21 days', () => {
    const within = new Date(createdAt.getTime() + 10 * day);
    expect(computeSlaState(thresholds, within)).toBe('green');
  });

  it('returns amber between 21 and 30 days', () => {
    const between = new Date(createdAt.getTime() + 25 * day);
    expect(computeSlaState(thresholds, between)).toBe('amber');
  });

  it('returns red after 30 days', () => {
    const after = new Date(createdAt.getTime() + 35 * day);
    expect(computeSlaState(thresholds, after)).toBe('red');
  });

  it('flips to amber exactly at 21 days and red exactly at 30 days', () => {
    const at21 = new Date(createdAt.getTime() + DSR_AMBER_DAYS * day);
    const at30 = new Date(createdAt.getTime() + DSR_RED_DAYS * day);
    expect(computeSlaState(thresholds, at21)).toBe('amber');
    expect(computeSlaState(thresholds, at30)).toBe('red');
  });
});

import { describe, it, expect } from 'vitest';
import { computeAgeYears, isMinorForDob } from './parental';

describe('computeAgeYears', () => {
  it('returns correct age for past dob', () => {
    const dob = new Date('2010-01-01');
    const now = new Date('2026-05-25');
    expect(computeAgeYears(dob, now)).toBe(16);
  });

  it('handles same-year birthday not yet reached', () => {
    const dob = new Date('2010-12-31');
    const now = new Date('2026-05-25');
    expect(computeAgeYears(dob, now)).toBe(15);
  });

  it('handles same-day birthday', () => {
    const dob = new Date('2010-05-25');
    const now = new Date('2026-05-25');
    expect(computeAgeYears(dob, now)).toBe(16);
  });
});

describe('isMinorForDob', () => {
  it('is true for a 14-year-old', () => {
    const dob = new Date('2012-05-25');
    const now = new Date('2026-05-25');
    expect(isMinorForDob(dob, now)).toBe(true);
  });

  it('is false on the 18th birthday', () => {
    const dob = new Date('2008-05-25');
    const now = new Date('2026-05-25');
    expect(isMinorForDob(dob, now)).toBe(false);
  });

  it('is true on the day before the 18th birthday', () => {
    const dob = new Date('2008-05-25');
    const now = new Date('2026-05-24');
    expect(isMinorForDob(dob, now)).toBe(true);
  });
});

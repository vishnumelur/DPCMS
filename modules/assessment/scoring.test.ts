import { describe, it, expect } from 'vitest';
import { computeRiskScore, scoreToLevel, MAX_RESPONSE_SCORE } from './scoring';

describe('computeRiskScore', () => {
  it('returns 0 / low when there are no responses', () => {
    expect(computeRiskScore([])).toEqual({ score: 0, level: 'low' });
  });

  it('returns low when every response scores 1 / weight 1', () => {
    const result = computeRiskScore([
      { score: 1, weight: 1 },
      { score: 1, weight: 1 },
      { score: 1, weight: 1 },
    ]);
    // 3/(3*5) * 100 = 20 → low
    expect(result.score).toBe(20);
    expect(result.level).toBe('low');
  });

  it('lands in the medium band with mixed responses', () => {
    const result = computeRiskScore([
      { score: 3, weight: 1 },
      { score: 2, weight: 1 },
      { score: 2, weight: 1 },
      { score: 3, weight: 1 },
    ]);
    // 10/(4*5) * 100 = 50 → medium (upper boundary)
    expect(result.score).toBe(50);
    expect(result.level).toBe('medium');
  });

  it('promotes to high when high-weight questions score badly', () => {
    const result = computeRiskScore([
      { score: 4, weight: 3 },
      { score: 4, weight: 3 },
      { score: 1, weight: 1 },
    ]);
    // (12+12+1) / (7*5) * 100 = 71.43 → 71 → high
    expect(result.score).toBe(71);
    expect(result.level).toBe('high');
  });

  it('returns critical when every response is at the maximum', () => {
    const result = computeRiskScore([
      { score: MAX_RESPONSE_SCORE, weight: 3 },
      { score: MAX_RESPONSE_SCORE, weight: 2 },
      { score: MAX_RESPONSE_SCORE, weight: 1 },
    ]);
    expect(result.score).toBe(100);
    expect(result.level).toBe('critical');
  });

  it('classifies thresholds exactly per the spec', () => {
    expect(scoreToLevel(0)).toBe('low');
    expect(scoreToLevel(25)).toBe('low');
    expect(scoreToLevel(26)).toBe('medium');
    expect(scoreToLevel(50)).toBe('medium');
    expect(scoreToLevel(51)).toBe('high');
    expect(scoreToLevel(75)).toBe('high');
    expect(scoreToLevel(76)).toBe('critical');
    expect(scoreToLevel(100)).toBe('critical');
  });
});

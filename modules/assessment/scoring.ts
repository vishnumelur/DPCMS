import type { RiskLevel } from './templates';

/**
 * A single response participating in the scoring sum. `score` is the per-question
 * answer score (0..MAX_RESPONSE_SCORE) and `weight` is the template-defined
 * multiplier (1..3 in practice).
 */
export type ScoringInput = { score: number; weight: number };

export const MAX_RESPONSE_SCORE = 5;
const FINAL_SCALE = 100;

/**
 * Combine per-question scores into a 0..100 risk score and a categorical risk
 * level.
 *
 * Mapping of the 0..100 score to risk levels:
 *   0..25  → low
 *   26..50 → medium
 *   51..75 → high
 *   76..100 → critical
 *
 * Pure function — no I/O, fully unit-tested.
 */
export function computeRiskScore(responses: readonly ScoringInput[]): {
  score: number;
  level: RiskLevel;
} {
  if (responses.length === 0) return { score: 0, level: 'low' };

  let weightedSum = 0;
  let weightSum = 0;
  for (const r of responses) {
    const safeScore = clamp(r.score, 0, MAX_RESPONSE_SCORE);
    const safeWeight = Math.max(0, r.weight);
    weightedSum += safeScore * safeWeight;
    weightSum += safeWeight;
  }

  if (weightSum === 0) return { score: 0, level: 'low' };

  // Normalise into a 0..100 scale.
  const normalised = (weightedSum / (weightSum * MAX_RESPONSE_SCORE)) * FINAL_SCALE;
  const score = Math.round(clamp(normalised, 0, FINAL_SCALE));

  return { score, level: scoreToLevel(score) };
}

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

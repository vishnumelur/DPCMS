import { createHash } from 'node:crypto';

export const GENESIS = 'GENESIS';

export type ChainRow = {
  ts: string;
  actor: string;
  action: string;
  target: string;
  payload: unknown;
  prevHash: string;
  rowHash: string;
};

/** Stable JSON serialisation: keys sorted recursively, no whitespace. */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const stringify = (v: unknown): string => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (seen.has(v as object)) throw new Error('canonicalJson: cyclic input');
    seen.add(v as object);
    if (Array.isArray(v)) return '[' + v.map(stringify).join(',') + ']';
    const keys = Object.keys(v as object).sort();
    return (
      '{' +
      keys
        .map((k) => JSON.stringify(k) + ':' + stringify((v as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  };
  return stringify(value);
}

export function hashRow(row: Omit<ChainRow, 'rowHash'>): string {
  const material =
    row.prevHash +
    '|' +
    row.ts +
    '|' +
    row.actor +
    '|' +
    row.action +
    '|' +
    row.target +
    '|' +
    canonicalJson(row.payload);
  return createHash('sha256').update(material).digest('hex');
}

export type VerifyResult = { ok: true } | { ok: false; brokenAtIndex: number; reason: string };

export function verifyChain(rows: ChainRow[]): VerifyResult {
  let prev = GENESIS;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.prevHash !== prev) return { ok: false, brokenAtIndex: i, reason: 'prev_hash_mismatch' };
    const expected = hashRow(r);
    if (r.rowHash !== expected) return { ok: false, brokenAtIndex: i, reason: 'row_hash_mismatch' };
    prev = r.rowHash;
  }
  return { ok: true };
}

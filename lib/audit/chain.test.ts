import { describe, it, expect } from 'vitest';
import { canonicalJson, hashRow, verifyChain, type ChainRow } from './chain';

describe('audit chain', () => {
  it('canonicalJson sorts keys deterministically', () => {
    const a = canonicalJson({ b: 2, a: 1 });
    const b = canonicalJson({ a: 1, b: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2}');
  });

  it('hashRow produces stable sha256 hex (64 chars)', () => {
    const h = hashRow({
      prevHash: 'GENESIS',
      ts: '2026-05-25T00:00:00Z',
      actor: 'user-1',
      action: 'consent.granted',
      target: 'artefact-1',
      payload: { p: 'ACC_OPENING' },
    });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyChain accepts a valid chain', () => {
    const rows: ChainRow[] = [
      { ts: 't1', actor: 'u', action: 'a', target: 't', payload: { n: 1 }, prevHash: 'GENESIS', rowHash: '' },
      { ts: 't2', actor: 'u', action: 'a', target: 't', payload: { n: 2 }, prevHash: '', rowHash: '' },
    ];
    rows[0]!.rowHash = hashRow(rows[0]!);
    rows[1]!.prevHash = rows[0]!.rowHash;
    rows[1]!.rowHash = hashRow(rows[1]!);
    expect(verifyChain(rows).ok).toBe(true);
  });

  it('verifyChain detects tampering of payload', () => {
    const rows: ChainRow[] = [
      { ts: 't1', actor: 'u', action: 'a', target: 't', payload: { n: 1 }, prevHash: 'GENESIS', rowHash: '' },
      { ts: 't2', actor: 'u', action: 'a', target: 't', payload: { n: 2 }, prevHash: '', rowHash: '' },
    ];
    rows[0]!.rowHash = hashRow(rows[0]!);
    rows[1]!.prevHash = rows[0]!.rowHash;
    rows[1]!.rowHash = hashRow(rows[1]!);
    // tamper
    rows[0]!.payload = { n: 999 };
    const result = verifyChain(rows);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.brokenAtIndex).toBe(0);
    }
  });

  it('verifyChain detects broken prev link', () => {
    const rows: ChainRow[] = [
      { ts: 't1', actor: 'u', action: 'a', target: 't', payload: { n: 1 }, prevHash: 'GENESIS', rowHash: '' },
      { ts: 't2', actor: 'u', action: 'a', target: 't', payload: { n: 2 }, prevHash: 'WRONG', rowHash: '' },
    ];
    rows[0]!.rowHash = hashRow(rows[0]!);
    rows[1]!.rowHash = hashRow(rows[1]!);
    const result = verifyChain(rows);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.brokenAtIndex).toBe(1);
    }
  });
});

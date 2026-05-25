import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encrypt';

describe('encrypt/decrypt (AES-256-GCM)', () => {
  it('round-trips a plain string', () => {
    const plain = 'JBSWY3DPEHPK3PXP'; // sample TOTP base32 secret
    const ct = encrypt(plain);
    expect(ct).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(decrypt(ct)).toBe(plain);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encrypt('hello');
    const b = encrypt('hello');
    expect(a).not.toEqual(b);
    expect(decrypt(a)).toBe('hello');
    expect(decrypt(b)).toBe('hello');
  });

  it('throws on malformed ciphertext', () => {
    expect(() => decrypt('not-valid')).toThrow();
  });

  it('throws on tampered ciphertext (GCM auth tag fails)', () => {
    const ct = encrypt('important');
    const [iv, tag, body] = ct.split(':') as [string, string, string];
    // Flip the last hex character of the body so the auth tag check fails.
    const flipped = body.slice(0, -1) + (body.endsWith('0') ? '1' : '0');
    expect(() => decrypt(`${iv}:${tag}:${flipped}`)).toThrow();
  });
});

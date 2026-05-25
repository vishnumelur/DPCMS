import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * AES-256-GCM encryption helper for at-rest secrets (TOTP seeds, etc.).
 *
 * Wire format: `<ivHex>:<tagHex>:<cipherHex>` — single string, safe to store in
 * a `text` column. The key is derived from `AUTH_SECRET` via SHA-256 so we get
 * a stable 32-byte key without adding another env var.
 *
 * Not a generic crypto API: callers should pass UTF-8 strings only. For binary
 * payloads, base64 first.
 */

function deriveKey(): Buffer {
  // SHA-256 of AUTH_SECRET → 32 bytes. AUTH_SECRET is required and ≥32 chars
  // per env schema, so this is well-defined.
  return createHash('sha256').update(env.AUTH_SECRET, 'utf8').digest();
}

export function encrypt(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(12); // 96-bit IV is the GCM standard
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

export function decrypt(enc: string): string {
  const parts = enc.split(':');
  if (parts.length !== 3) throw new Error('encrypt: malformed ciphertext (expected iv:tag:ct)');
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const key = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ct), decipher.final()]);
  return out.toString('utf8');
}

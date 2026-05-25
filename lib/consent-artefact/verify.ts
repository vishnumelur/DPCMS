import { compactVerify } from 'jose';
import { getOrgVerificationKey } from './keys';

export async function verifyConsentJws(
  orgId: string,
  jws: string,
): Promise<{ valid: boolean; body?: Record<string, unknown>; reason?: string }> {
  const key = await getOrgVerificationKey(orgId);
  if (!key) return { valid: false, reason: 'no_key_for_org' };

  try {
    const { payload, protectedHeader } = await compactVerify(jws, key.publicKey);
    if (protectedHeader.alg !== 'RS256') {
      return { valid: false, reason: `unexpected_alg:${String(protectedHeader.alg)}` };
    }
    const text = new TextDecoder().decode(payload);
    const body = JSON.parse(text) as Record<string, unknown>;
    return { valid: true, body };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : 'verify_failed' };
  }
}

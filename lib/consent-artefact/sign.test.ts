import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  generateKeyPair,
  CompactSign,
  compactVerify,
  exportPKCS8,
  exportSPKI,
  importPKCS8,
  importSPKI,
} from 'jose';
import { canonicalJson } from '@/lib/audit/chain';
import type { ConsentArtefactBody } from './sign';

const ALG = 'RS256';

function sampleBody(): ConsentArtefactBody {
  return {
    ver: '1.0-poc',
    consentId: '11111111-1111-1111-1111-111111111111',
    principal: { id_hash: 'sha256:' + 'a'.repeat(64) },
    dataConsumer: { id: 'kscb-org-1' },
    purpose: { code: 'ACCOUNT_OPENING', lawfulBasis: 'consent' },
    iat: 1_700_000_000,
    exp: 1_900_000_000,
  };
}

describe('consent-artefact sign/verify (pure jose round-trip)', () => {
  // The integration variant (DB-backed key material) is in
  // modules/consent/artefacts.test.ts under describe.skip.

  it('generates a fresh RS256 keypair and exports PKCS8/SPKI PEMs', async () => {
    const kp = await generateKeyPair(ALG, { extractable: true });
    const priv = await exportPKCS8(kp.privateKey as CryptoKey);
    const pub = await exportSPKI(kp.publicKey as CryptoKey);
    expect(priv.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true);
    expect(pub.startsWith('-----BEGIN PUBLIC KEY-----')).toBe(true);

    // Re-importable.
    const reImportedPriv = await importPKCS8(priv, ALG);
    const reImportedPub = await importSPKI(pub, ALG);
    expect(reImportedPriv).toBeDefined();
    expect(reImportedPub).toBeDefined();
  });

  it('sign + verify round-trip recovers the canonical body', async () => {
    const kp = await generateKeyPair(ALG, { extractable: true });
    const body = sampleBody();
    const canonical = canonicalJson(body);
    const bodyHash = createHash('sha256').update(canonical).digest('hex');
    expect(bodyHash).toMatch(/^[0-9a-f]{64}$/);

    const jws = await new CompactSign(new TextEncoder().encode(canonical))
      .setProtectedHeader({ alg: ALG, kid: 'test-kid', typ: 'consent-artefact+jws' })
      .sign(kp.privateKey);

    const { payload, protectedHeader } = await compactVerify(jws, kp.publicKey);
    expect(protectedHeader.alg).toBe(ALG);
    expect(protectedHeader.kid).toBe('test-kid');
    const recovered = JSON.parse(new TextDecoder().decode(payload));
    expect(recovered).toEqual(body);
  });

  it('tampered JWS fails verify', async () => {
    const kp = await generateKeyPair(ALG, { extractable: true });
    const body = sampleBody();
    const canonical = canonicalJson(body);
    const jws = await new CompactSign(new TextEncoder().encode(canonical))
      .setProtectedHeader({ alg: ALG, kid: 'test-kid' })
      .sign(kp.privateKey);

    // Flip a single character in the payload segment.
    const parts = jws.split('.');
    expect(parts).toHaveLength(3);
    const payloadSeg = parts[1]!;
    // mutate the last character of the payload base64url
    const mutatedChar = payloadSeg.endsWith('A') ? 'B' : 'A';
    const mutatedPayload = payloadSeg.slice(0, -1) + mutatedChar;
    parts[1] = mutatedPayload;
    const tampered = parts.join('.');

    await expect(compactVerify(tampered, kp.publicKey)).rejects.toThrow();
  });
});

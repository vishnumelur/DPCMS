import { createHash } from 'node:crypto';
import { CompactSign } from 'jose';
import { canonicalJson } from '@/lib/audit/chain';
import { getOrgSigningKey } from './keys';

export type ConsentArtefactBody = {
  ver: '1.0-poc';
  consentId: string;
  principal: { id_hash: string };
  dataConsumer: { id: string };
  purpose: { code: string; lawfulBasis: string };
  iat: number;
  exp: number;
  [k: string]: unknown;
};

/**
 * Sign a DEPA-style consent body. Returns the JWS compact serialisation and
 * a sha256 hex digest of the canonical (sorted-keys) JSON body for tamper
 * detection independent of the JWS signature.
 */
export async function signConsentBody(
  orgId: string,
  body: ConsentArtefactBody,
): Promise<{ jws: string; bodyHash: string; kid: string }> {
  const { privateKey, kid } = await getOrgSigningKey(orgId);
  const canonical = canonicalJson(body);
  const bodyHash = createHash('sha256').update(canonical).digest('hex');

  const jws = await new CompactSign(new TextEncoder().encode(canonical))
    .setProtectedHeader({ alg: 'RS256', kid, typ: 'consent-artefact+jws' })
    .sign(privateKey);

  return { jws, bodyHash, kid };
}

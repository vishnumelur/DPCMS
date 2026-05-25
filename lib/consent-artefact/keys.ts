/**
 * RS256 key management for DEPA-style consent artefact signing.
 *
 * On first use per org, generates an RS256 keypair and stores it in app_keys.
 * The private key is stored as plaintext PEM in private_pem_encrypted (the
 * column name predates this feature — a future P5 task will wrap it with
 * envelope encryption keyed off CRON_SECRET / KMS).
 *
 * Cached in-memory per process so signing is hot-path friendly.
 */
import { db } from '@/db/client';
import { appKeys } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { generateKeyPair, exportPKCS8, exportSPKI, importPKCS8, importSPKI } from 'jose';
import type { KeyObject } from 'node:crypto';

export type OrgKeyMaterial = {
  kid: string;
  publicKey: CryptoKey | KeyObject;
  privateKey: CryptoKey | KeyObject;
  publicPem: string;
};

const cache = new Map<string, OrgKeyMaterial>();

const ALG = 'RS256';

export async function getOrgSigningKey(orgId: string): Promise<OrgKeyMaterial> {
  const cached = cache.get(orgId);
  if (cached) return cached;

  // Look up the most recent key row for this org.
  const rows = await db
    .select()
    .from(appKeys)
    .where(eq(appKeys.orgId, orgId))
    .orderBy(desc(appKeys.createdAt))
    .limit(1);
  const row = rows[0];

  let kid: string;
  let publicPem: string;
  let privatePem: string;

  if (row) {
    kid = row.kid;
    publicPem = row.publicPem;
    privatePem = row.privatePemEncrypted;
  } else {
    const kp = await generateKeyPair(ALG, { extractable: true });
    publicPem = await exportSPKI(kp.publicKey as CryptoKey);
    privatePem = await exportPKCS8(kp.privateKey as CryptoKey);
    kid = `consent-${orgId.slice(0, 8)}-${Date.now()}`;
    await db.insert(appKeys).values({
      orgId,
      kid,
      publicPem,
      privatePemEncrypted: privatePem,
    });
  }

  const publicKey = await importSPKI(publicPem, ALG);
  const privateKey = await importPKCS8(privatePem, ALG);

  const mat: OrgKeyMaterial = { kid, publicKey, privateKey, publicPem };
  cache.set(orgId, mat);
  return mat;
}

/** Test-only — drop cached key material (e.g. after rotation). */
export function _resetKeyCache(orgId?: string) {
  if (orgId) cache.delete(orgId);
  else cache.clear();
}

/**
 * Look up *only* the public key (e.g. for verification when the signer is
 * elsewhere). Returns null if no key has been provisioned yet.
 */
export async function getOrgVerificationKey(
  orgId: string,
): Promise<{ kid: string; publicKey: CryptoKey | KeyObject; publicPem: string } | null> {
  const cached = cache.get(orgId);
  if (cached) {
    return { kid: cached.kid, publicKey: cached.publicKey, publicPem: cached.publicPem };
  }
  const rows = await db
    .select()
    .from(appKeys)
    .where(eq(appKeys.orgId, orgId))
    .orderBy(desc(appKeys.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const publicKey = await importSPKI(row.publicPem, ALG);
  return { kid: row.kid, publicKey, publicPem: row.publicPem };
}

/**
 * Suppress the unused-import warning for `and` so this file remains a clean
 * module if filtering by kid is added later.
 */
void and;

import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/db/client';
import {
  consentArtefact,
  consentPreference,
  org as orgTable,
} from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';
import { signConsentBody } from '@/lib/consent-artefact/sign';
import { getPurposeById, getLatestPublishedTemplate } from './purposes';

function hashPrincipalId(userId: string, saltHex: string): string {
  return 'sha256:' + createHash('sha256').update(userId + ':' + saltHex).digest('hex');
}

async function getOrgSlugAndSalt(orgId: string): Promise<{ slug: string; saltHex: string }> {
  const rows = await db
    .select({ slug: orgTable.slug, saltHex: orgTable.saltHex })
    .from(orgTable)
    .where(eq(orgTable.id, orgId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`org ${orgId} not found`);
  return row;
}

async function getLatestArtefact(orgId: string, principalUserId: string, purposeId: string) {
  const rows = await db
    .select()
    .from(consentArtefact)
    .where(
      and(
        eq(consentArtefact.orgId, orgId),
        eq(consentArtefact.principalUserId, principalUserId),
        eq(consentArtefact.purposeId, purposeId),
      ),
    )
    .orderBy(desc(consentArtefact.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function grantConsent(params: {
  orgId: string;
  principalUserId: string;
  purposeId: string;
  audit: AuditContext;
}) {
  const { orgId, principalUserId, purposeId, audit } = params;

  const p = await getPurposeById(orgId, purposeId);
  if (!p) throw new Error('purpose_not_found');

  const tpl = await getLatestPublishedTemplate(orgId, purposeId, 'en');
  if (!tpl || !tpl.publishedAt) throw new Error('no_published_template');

  const { slug, saltHex } = await getOrgSlugAndSalt(orgId);
  const consentId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ver: '1.0-poc' as const,
    consentId,
    principal: { id_hash: hashPrincipalId(principalUserId, saltHex) },
    dataConsumer: { id: slug },
    purpose: { code: p.code, lawfulBasis: p.lawfulBasis },
    iat: now,
    exp: now + 60 * 60 * 24 * 365, // 1 year
    templateVersion: tpl.version,
    templateLang: tpl.languageCode,
  };

  const { jws, bodyHash } = await signConsentBody(orgId, body);

  const prev = await getLatestArtefact(orgId, principalUserId, purposeId);

  const [artefact] = await db
    .insert(consentArtefact)
    .values({
      id: consentId,
      orgId,
      principalUserId,
      purposeId,
      templateId: tpl.id,
      kind: 'granted',
      prevArtefactId: prev?.id ?? null,
      jws,
      bodyHash,
    })
    .returning();
  if (!artefact) throw new Error('artefact_insert_failed');

  // Upsert the preference row to point at the new artefact.
  await db
    .insert(consentPreference)
    .values({
      orgId,
      principalUserId,
      purposeId,
      status: 'active',
      currentArtefactId: artefact.id,
    })
    .onConflictDoUpdate({
      target: [consentPreference.principalUserId, consentPreference.purposeId],
      set: { status: 'active', currentArtefactId: artefact.id, updatedAt: new Date() },
    });

  await appendAudit(audit, {
    stream: 'consent',
    action: 'consent.granted',
    target: purposeId,
    payload: { purposeCode: p.code, artefactId: artefact.id, kind: 'granted', bodyHash },
  });

  return artefact;
}

export async function withdrawConsent(params: {
  orgId: string;
  principalUserId: string;
  purposeId: string;
  audit: AuditContext;
}) {
  const { orgId, principalUserId, purposeId, audit } = params;

  const p = await getPurposeById(orgId, purposeId);
  if (!p) throw new Error('purpose_not_found');

  const tpl = await getLatestPublishedTemplate(orgId, purposeId, 'en');
  if (!tpl) throw new Error('no_template');

  const { slug, saltHex } = await getOrgSlugAndSalt(orgId);
  const consentId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ver: '1.0-poc' as const,
    consentId,
    principal: { id_hash: hashPrincipalId(principalUserId, saltHex) },
    dataConsumer: { id: slug },
    purpose: { code: p.code, lawfulBasis: p.lawfulBasis },
    iat: now,
    exp: now, // withdrawal: immediately expired
    revocation: true,
  };

  const { jws, bodyHash } = await signConsentBody(orgId, body);

  const prev = await getLatestArtefact(orgId, principalUserId, purposeId);

  const [artefact] = await db
    .insert(consentArtefact)
    .values({
      id: consentId,
      orgId,
      principalUserId,
      purposeId,
      templateId: tpl.id,
      kind: 'withdrawn',
      prevArtefactId: prev?.id ?? null,
      jws,
      bodyHash,
      revokedAt: new Date(),
    })
    .returning();
  if (!artefact) throw new Error('artefact_insert_failed');

  await db
    .insert(consentPreference)
    .values({
      orgId,
      principalUserId,
      purposeId,
      status: 'withdrawn',
      currentArtefactId: artefact.id,
    })
    .onConflictDoUpdate({
      target: [consentPreference.principalUserId, consentPreference.purposeId],
      set: { status: 'withdrawn', currentArtefactId: artefact.id, updatedAt: new Date() },
    });

  await appendAudit(audit, {
    stream: 'consent',
    action: 'consent.withdrawn',
    target: purposeId,
    payload: { purposeCode: p.code, artefactId: artefact.id, kind: 'withdrawn', bodyHash },
  });

  return artefact;
}

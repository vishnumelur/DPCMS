import { db } from '@/db/client';
import { purpose, consentArtefact, consentTemplate } from '@/db/schema';
import { and, eq, sql, count } from 'drizzle-orm';

export type Purpose = typeof purpose.$inferSelect;
export type NewPurpose = typeof purpose.$inferInsert;

export async function listPurposes(orgId: string) {
  return db.select().from(purpose).where(eq(purpose.orgId, orgId)).orderBy(purpose.code);
}

export async function getPurpose(orgId: string, code: string) {
  const rows = await db
    .select()
    .from(purpose)
    .where(and(eq(purpose.orgId, orgId), eq(purpose.code, code)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPurposeById(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(purpose)
    .where(and(eq(purpose.orgId, orgId), eq(purpose.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createPurpose(input: {
  orgId: string;
  code: string;
  name: string;
  description?: string;
  lawfulBasis?: string;
  dataCategories?: string[];
}) {
  const [row] = await db
    .insert(purpose)
    .values({
      orgId: input.orgId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      lawfulBasis: input.lawfulBasis ?? 'consent',
      dataCategories: input.dataCategories ?? [],
    })
    .returning();
  return row ?? null;
}

/**
 * Aggregate artefact counts per (purpose, kind). Returns a map keyed by
 * purposeId with { granted, withdrawn } counts.
 */
export async function getArtefactCountsByPurpose(orgId: string) {
  const rows = await db
    .select({
      purposeId: consentArtefact.purposeId,
      kind: consentArtefact.kind,
      n: count(),
    })
    .from(consentArtefact)
    .where(eq(consentArtefact.orgId, orgId))
    .groupBy(consentArtefact.purposeId, consentArtefact.kind);

  const map = new Map<string, { granted: number; withdrawn: number; renewed: number }>();
  for (const r of rows) {
    const cur = map.get(r.purposeId) ?? { granted: 0, withdrawn: 0, renewed: 0 };
    if (r.kind === 'granted') cur.granted = Number(r.n);
    else if (r.kind === 'withdrawn') cur.withdrawn = Number(r.n);
    else if (r.kind === 'renewed') cur.renewed = Number(r.n);
    map.set(r.purposeId, cur);
  }
  return map;
}

/**
 * Latest published template for a purpose (English fallback). Used by grant
 * flows to bind an artefact to a specific template version.
 */
export async function getLatestPublishedTemplate(
  orgId: string,
  purposeId: string,
  languageCode: string = 'en',
) {
  const rows = await db
    .select()
    .from(consentTemplate)
    .where(
      and(
        eq(consentTemplate.orgId, orgId),
        eq(consentTemplate.purposeId, purposeId),
        eq(consentTemplate.languageCode, languageCode),
      ),
    )
    .orderBy(sql`${consentTemplate.version} desc`)
    .limit(1);
  return rows[0] ?? null;
}

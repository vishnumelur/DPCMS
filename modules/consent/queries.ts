import { db } from '@/db/client';
import { purpose, consentPreference, consentArtefact } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export type CustomerConsentRow = {
  purpose: typeof purpose.$inferSelect;
  preference: typeof consentPreference.$inferSelect | null;
  latestArtefact: typeof consentArtefact.$inferSelect | null;
};

/**
 * Returns every purpose for an org plus the current preference + latest
 * artefact for the given principal. Purposes without any prior interaction
 * appear with preference=null / latestArtefact=null.
 */
export async function getCustomerConsents(
  orgId: string,
  principalUserId: string,
): Promise<CustomerConsentRow[]> {
  const purposes = await db
    .select()
    .from(purpose)
    .where(eq(purpose.orgId, orgId))
    .orderBy(purpose.code);

  const out: CustomerConsentRow[] = [];
  for (const p of purposes) {
    const prefRows = await db
      .select()
      .from(consentPreference)
      .where(
        and(
          eq(consentPreference.orgId, orgId),
          eq(consentPreference.principalUserId, principalUserId),
          eq(consentPreference.purposeId, p.id),
        ),
      )
      .limit(1);
    const pref = prefRows[0] ?? null;

    let latestArtefact: typeof consentArtefact.$inferSelect | null = null;
    if (pref) {
      const aRows = await db
        .select()
        .from(consentArtefact)
        .where(eq(consentArtefact.id, pref.currentArtefactId))
        .limit(1);
      latestArtefact = aRows[0] ?? null;
    } else {
      const aRows = await db
        .select()
        .from(consentArtefact)
        .where(
          and(
            eq(consentArtefact.orgId, orgId),
            eq(consentArtefact.principalUserId, principalUserId),
            eq(consentArtefact.purposeId, p.id),
          ),
        )
        .orderBy(desc(consentArtefact.createdAt))
        .limit(1);
      latestArtefact = aRows[0] ?? null;
    }

    out.push({ purpose: p, preference: pref, latestArtefact });
  }
  return out;
}

export async function getPurposePreferences(orgId: string, purposeId: string) {
  return db
    .select()
    .from(consentPreference)
    .where(
      and(eq(consentPreference.orgId, orgId), eq(consentPreference.purposeId, purposeId)),
    )
    .orderBy(desc(consentPreference.updatedAt));
}

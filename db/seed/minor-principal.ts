import { db } from '@/db/client';
import { user, purpose, principalMinorFlag, consentArtefact } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { grantConsent } from '@/modules/consent/artefacts';

const MINOR_EMAIL = 'demo-minor@kscb.local';
const MINOR_NAME = 'Demo Minor';
const GUARDIAN_NAME = 'Demo Parent';
const GUARDIAN_EMAIL = 'demo-parent@kscb.local';
const GUARDIAN_RELATION = 'parent';

/**
 * Seed a 14-year-old demo principal with a guardian-granted consent for
 * ACCOUNT_OPENING. Lets evaluators inspect the artefact shape carrying a
 * parental evidence blob. Idempotent: re-running is a no-op.
 */
export async function seedMinorPrincipal(orgId: string) {
  const existing = await db.select().from(user).where(eq(user.email, MINOR_EMAIL)).limit(1);
  let minorId: string;
  if (existing[0]) {
    minorId = existing[0].id;
    console.log(`Minor user ${MINOR_EMAIL} already exists.`);
  } else {
    const [created] = await db
      .insert(user)
      .values({
        orgId,
        email: MINOR_EMAIL,
        name: MINOR_NAME,
        passwordHash: null,
        emailVerified: null,
      })
      .returning();
    if (!created) throw new Error('Failed to seed minor user');
    minorId = created.id;
    console.log(`Seeded minor user ${MINOR_EMAIL}.`);
  }

  // 14 years old today.
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - 14);

  const flagRows = await db
    .select()
    .from(principalMinorFlag)
    .where(eq(principalMinorFlag.principalUserId, minorId))
    .limit(1);
  if (!flagRows[0]) {
    await db.insert(principalMinorFlag).values({
      orgId,
      principalUserId: minorId,
      declaredDateOfBirth: dob.toISOString().slice(0, 10),
      isMinor: true,
      guardianName: GUARDIAN_NAME,
      guardianEmail: GUARDIAN_EMAIL,
      guardianRelation: GUARDIAN_RELATION,
      verificationMethod: 'declared',
    });
    console.log(`Seeded principal_minor_flag for ${MINOR_EMAIL}.`);
  }

  const acctPurpose = await db
    .select()
    .from(purpose)
    .where(and(eq(purpose.orgId, orgId), eq(purpose.code, 'ACCOUNT_OPENING')))
    .limit(1);
  const purposeRow = acctPurpose[0];
  if (!purposeRow) {
    console.log('ACCOUNT_OPENING purpose missing — minor consent seed skipped.');
    return;
  }

  const existingArtefact = await db
    .select()
    .from(consentArtefact)
    .where(
      and(
        eq(consentArtefact.orgId, orgId),
        eq(consentArtefact.principalUserId, minorId),
        eq(consentArtefact.purposeId, purposeRow.id),
      ),
    )
    .limit(1);
  if (existingArtefact[0]) {
    console.log('Guardian-granted artefact already exists for minor — skipping.');
    return;
  }

  await grantConsent({
    orgId,
    principalUserId: minorId,
    purposeId: purposeRow.id,
    audit: { orgId, actorUserId: minorId, actorLabel: MINOR_EMAIL },
    parentalEvidence: {
      guardianName: GUARDIAN_NAME,
      guardianEmail: GUARDIAN_EMAIL,
      guardianRelation: GUARDIAN_RELATION,
      declaredAt: new Date().toISOString(),
    },
  });
  console.log('Seeded guardian-granted consent for minor → ACCOUNT_OPENING.');
}

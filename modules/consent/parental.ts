import { db } from '@/db/client';
import { principalMinorFlag } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const MINOR_AGE_LIMIT_YEARS = 18; // DPDP Act §9: "person under 18".

export type GuardianDetails = {
  name: string;
  email: string;
  relation: string;
};

export function computeAgeYears(dob: Date, now: Date = new Date()): number {
  let years = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) years--;
  return years;
}

export function isMinorForDob(dob: Date, now: Date = new Date()): boolean {
  return computeAgeYears(dob, now) < MINOR_AGE_LIMIT_YEARS;
}

/**
 * Idempotent: if a row already exists for this principal, update; else insert.
 * Always recomputes isMinor from the date-of-birth field on the input.
 */
export async function declareMinor(params: {
  orgId: string;
  principalUserId: string;
  dob: Date;
  guardian?: GuardianDetails;
  verificationMethod?: 'declared' | 'aadhaar' | 'documentary';
}): Promise<{ isMinor: boolean }> {
  const isMinor = isMinorForDob(params.dob);

  const dobIso = params.dob.toISOString().slice(0, 10);

  const existing = await db
    .select()
    .from(principalMinorFlag)
    .where(eq(principalMinorFlag.principalUserId, params.principalUserId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(principalMinorFlag)
      .set({
        declaredDateOfBirth: dobIso,
        isMinor,
        guardianName: params.guardian?.name ?? existing[0].guardianName,
        guardianEmail: params.guardian?.email ?? existing[0].guardianEmail,
        guardianRelation: params.guardian?.relation ?? existing[0].guardianRelation,
        verificationMethod: params.verificationMethod ?? existing[0].verificationMethod,
      })
      .where(eq(principalMinorFlag.id, existing[0].id));
  } else {
    await db.insert(principalMinorFlag).values({
      orgId: params.orgId,
      principalUserId: params.principalUserId,
      declaredDateOfBirth: dobIso,
      isMinor,
      guardianName: params.guardian?.name ?? null,
      guardianEmail: params.guardian?.email ?? null,
      guardianRelation: params.guardian?.relation ?? null,
      verificationMethod: params.verificationMethod ?? 'declared',
    });
  }

  return { isMinor };
}

export async function getMinorFlag(orgId: string, principalUserId: string) {
  const rows = await db
    .select()
    .from(principalMinorFlag)
    .where(
      and(
        eq(principalMinorFlag.orgId, orgId),
        eq(principalMinorFlag.principalUserId, principalUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

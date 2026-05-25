'use server';

import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { mfaFactor } from '@/db/schema';
import { getActor } from './_actor';
import { createTotpFactor, verifyTotp } from '@/lib/auth/mfa';
import { encrypt, decrypt } from '@/lib/auth/encrypt';
import { appendAudit } from '@/lib/audit/with-audit';
import { unstable_update as updateSession } from '@/auth';

/**
 * Step 1 of enrolment: generate a fresh TOTP factor, store it (unconfirmed,
 * encrypted) and return the otpauth:// URI + base32 secret to the page so it
 * can render a QR code and manual-entry string.
 *
 * Idempotent: if an unconfirmed factor already exists for the user we reuse
 * it (so refreshing the page doesn't leak factors); confirmed factors are
 * not overwritten — callers must delete the confirmed one first.
 */
export async function startMfaEnrolmentAction(): Promise<{
  secret: string;
  uri: string;
}> {
  const actor = await getActor();

  const existing = await db
    .select()
    .from(mfaFactor)
    .where(eq(mfaFactor.userId, actor.actorUserId))
    .limit(1);

  if (existing[0]?.confirmed) {
    // Already enrolled — surface the page-level message rather than re-issuing.
    throw new Error('mfa_already_confirmed');
  }

  // Re-use an unconfirmed factor on refresh so we don't accumulate rows.
  if (existing[0] && !existing[0].confirmed) {
    const secret = decrypt(existing[0].secretEncrypted);
    const { uri } = createTotpFactor({ accountLabel: actor.actorLabel });
    // The URI embeds the secret so we rebuild from the persisted one.
    const rebuiltUri = buildOtpAuthUri({ secret, accountLabel: actor.actorLabel });
    void uri;
    return { secret, uri: rebuiltUri };
  }

  const factor = createTotpFactor({ accountLabel: actor.actorLabel });
  await db.insert(mfaFactor).values({
    userId: actor.actorUserId,
    kind: 'totp',
    secretEncrypted: encrypt(factor.secret),
    confirmed: false,
  });
  return { secret: factor.secret, uri: factor.uri };
}

/**
 * Step 2 of enrolment: user types the current 6-digit code from their app.
 * If it verifies, mark the factor confirmed and flip the session to mfaVerified.
 */
export async function confirmMfaAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  const code = String(formData.get('code') ?? '').trim();
  if (!/^\d{6}$/.test(code)) throw new Error('mfa_code_invalid_format');

  const rows = await db
    .select()
    .from(mfaFactor)
    .where(eq(mfaFactor.userId, actor.actorUserId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error('mfa_not_started');
  if (row.confirmed) throw new Error('mfa_already_confirmed');

  const secret = decrypt(row.secretEncrypted);
  const ok = verifyTotp(secret, code);
  if (!ok) {
    // Bounce back to setup with a flag so the page can show an error.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect('/mfa/setup?error=invalid' as any);
  }

  await db
    .update(mfaFactor)
    .set({ confirmed: true, lastUsedAt: new Date() })
    .where(eq(mfaFactor.id, row.id));

  await appendAudit(
    { orgId: actor.orgId, actorUserId: actor.actorUserId, actorLabel: actor.actorLabel },
    {
      stream: 'system',
      action: 'mfa.enrolled',
      target: actor.actorUserId,
      payload: { kind: 'totp' },
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateSession({ mfaVerified: true, mfaEnrolled: true } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect('/admin/settings?mfa=enabled' as any);
}

/**
 * Sign-in MFA challenge: user has already passed credentials, now types a code
 * for an already-confirmed factor. Sets mfaVerified on the session and
 * redirects to the original callback target (defaults to /admin).
 */
export async function verifyMfaAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  const code = String(formData.get('code') ?? '').trim();
  const callback = String(formData.get('callbackUrl') ?? '/admin');
  if (!/^\d{6}$/.test(code)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect(`/mfa/verify?error=format&callbackUrl=${encodeURIComponent(callback)}` as any);
  }

  const rows = await db
    .select()
    .from(mfaFactor)
    .where(and(eq(mfaFactor.userId, actor.actorUserId), eq(mfaFactor.confirmed, true)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    // Nothing to verify — let them in (opt-in policy).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateSession({ mfaVerified: true } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect(callback as any);
  }

  const secret = decrypt(row.secretEncrypted);
  const ok = verifyTotp(secret, code);
  if (!ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect(`/mfa/verify?error=invalid&callbackUrl=${encodeURIComponent(callback)}` as any);
  }

  await db.update(mfaFactor).set({ lastUsedAt: new Date() }).where(eq(mfaFactor.id, row.id));

  await appendAudit(
    { orgId: actor.orgId, actorUserId: actor.actorUserId, actorLabel: actor.actorLabel },
    {
      stream: 'system',
      action: 'mfa.verified',
      target: actor.actorUserId,
      payload: { kind: 'totp' },
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateSession({ mfaVerified: true } as any);
  // Only allow same-origin path callbacks to avoid open-redirect surprises.
  const safe = callback.startsWith('/') ? callback : '/admin';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect(safe as any);
}

// --- helpers ---

function buildOtpAuthUri({
  secret,
  accountLabel,
}: {
  secret: string;
  accountLabel: string;
}): string {
  const issuer = 'DPCMS';
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/db/client';
import { cookieConsentRecord, org as orgTable, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { appendAudit } from '@/lib/audit/with-audit';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'dpcms-cookie-session';

function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(ip + ':' + salt).digest('hex');
}

export async function POST(req: Request) {
  let body: { accepted?: unknown } = {};
  try {
    body = (await req.json()) as { accepted?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const accepted = Array.isArray(body.accepted)
    ? (body.accepted.filter((x) => typeof x === 'string') as string[])
    : [];

  // Resolve org — for the POC we have a single seeded org. If multi-tenant, the
  // future cookie banner would pass an explicit orgId or read it from a host header.
  const orgs = await db.select().from(orgTable).limit(1);
  const orgRow = orgs[0];
  if (!orgRow) return NextResponse.json({ ok: false, error: 'no_org' }, { status: 500 });

  // Resolve principal user if signed-in.
  const session = await auth();
  let principalUserId: string | null = null;
  let actorLabel = 'anonymous';
  if (session?.user?.email) {
    const rows = await db.select().from(user).where(eq(user.email, session.user.email)).limit(1);
    if (rows[0]) {
      principalUserId = rows[0].id;
      actorLabel = rows[0].email;
    }
  }

  // Resolve session id from cookie (or mint a fresh one).
  const cookieHeader = req.headers.get('cookie') ?? '';
  const m = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const existingSessionId = m?.[1];
  const sessionId = existingSessionId && existingSessionId.length > 0 ? existingSessionId : randomUUID();

  const userAgent = req.headers.get('user-agent');
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? hashIp(ip, env.CRON_SECRET) : null;

  const [record] = await db
    .insert(cookieConsentRecord)
    .values({
      orgId: orgRow.id,
      principalUserId,
      sessionId,
      categoriesAccepted: accepted,
      userAgent: userAgent ?? null,
      ipHash,
    })
    .returning();

  await appendAudit(
    { orgId: orgRow.id, actorUserId: principalUserId, actorLabel },
    {
      stream: 'consent',
      action: 'cookie.consent.recorded',
      target: sessionId,
      payload: { accepted, recordId: record?.id ?? null, hasUser: principalUserId !== null },
    },
  );

  const res = NextResponse.json({ ok: true, accepted, sessionId });
  if (!existingSessionId) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

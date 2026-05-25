import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.execute(sql`select 1 as ok`);
    return NextResponse.json({
      ok: true,
      db: result.rows?.[0] ?? null,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, ts: new Date().toISOString() },
      { status: 503 },
    );
  }
}

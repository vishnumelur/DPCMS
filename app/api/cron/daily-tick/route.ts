import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Phase P0: no scheduled work yet — endpoint exists so vercel cron config validates.
  // Later phases will sweep sla_clock for state-change notifications.
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), tasks: [] });
}

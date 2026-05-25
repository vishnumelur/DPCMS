import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { gatherReportingSnapshot } from '@/lib/reporting/aggregate';
import { RFP_REQUIREMENTS, summariseStatus } from '@/lib/rfp/matrix-data';
import type { RfpRequirement, RfpStatus } from '@/lib/rfp/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) {
    return NextResponse.json({ error: 'no_org' }, { status: 403 });
  }

  const snapshot = await gatherReportingSnapshot(u.orgId);
  const rfpCounts = summariseStatus();

  // Per-module RA/CA/NA totals.
  const perModule = new Map<string, Record<RfpStatus, number>>();
  for (const r of RFP_REQUIREMENTS) {
    const bucket = perModule.get(r.module) ?? { RA: 0, CA: 0, NA: 0 };
    bucket[r.status] += 1;
    perModule.set(r.module, bucket);
  }
  const perModuleArr = Array.from(perModule.entries()).map(([module, counts]) => ({
    module,
    ...counts,
    total: counts.RA + counts.CA + counts.NA,
  }));

  const body = {
    schema: 'dpcms.board-pack/v1',
    generatedAt: snapshot.generatedAt,
    org: { id: u.orgId },
    kpis: snapshot.kpis,
    consentByStatus: snapshot.consentByStatus,
    dsrByKind: snapshot.dsrByKind,
    breachBySeverity: snapshot.breachBySeverity,
    connectorEventsByDay: snapshot.connectorEventsByDay,
    rfp: {
      counts: rfpCounts,
      perModule: perModuleArr,
      requirements: RFP_REQUIREMENTS.map((r: RfpRequirement) => ({
        id: r.id,
        module: r.module,
        status: r.status,
        phase: r.phase,
        demoPath: r.demoPath ?? null,
      })),
    },
  };

  const filename = `dpcms-board-pack-${snapshot.generatedAt.slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

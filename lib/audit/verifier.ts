import { db } from '@/db/client';
import { auditLog } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { verifyChain, type ChainRow } from './chain';

export async function verifyStream(orgId: string, stream: string) {
  const rows = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.orgId, orgId), eq(auditLog.stream, stream)))
    .orderBy(asc(auditLog.seq));

  const chainRows: ChainRow[] = rows.map((r) => ({
    ts: r.ts.toISOString(),
    actor: r.actorLabel,
    action: r.action,
    target: r.target,
    payload: r.payload,
    prevHash: r.prevHash,
    rowHash: r.rowHash,
  }));

  return { count: chainRows.length, ...verifyChain(chainRows) };
}

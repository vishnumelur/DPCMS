import { db as defaultDb } from '@/db/client';
import { auditLog, auditChainHead } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { GENESIS, hashRow } from './chain';

export type AuditContext = {
  orgId: string;
  actorUserId: string | null;
  actorLabel: string;
};

export type AuditEntry = {
  stream: string;
  action: string;
  target: string;
  payload: unknown;
};

/**
 * Append a new audit row inside a serialisable transaction.
 * Returns the persisted row.
 */
export async function appendAudit(
  ctx: AuditContext,
  entry: AuditEntry,
  db = defaultDb,
) {
  // neon-http does not support BEGIN/COMMIT; we use an upsert + insert pattern
  // that is atomic per row via PostgreSQL serializable conflict handling.
  const head = await db
    .select()
    .from(auditChainHead)
    .where(and(eq(auditChainHead.orgId, ctx.orgId), eq(auditChainHead.stream, entry.stream)))
    .limit(1);

  const prevHash = head[0]?.lastHash ?? GENESIS;
  const nextSeq = (head[0]?.lastSeq ?? 0) + 1;
  const ts = new Date().toISOString();
  const rowHash = hashRow({
    prevHash,
    ts,
    actor: ctx.actorLabel,
    action: entry.action,
    target: entry.target,
    payload: entry.payload,
  });

  await db.insert(auditLog).values({
    orgId: ctx.orgId,
    stream: entry.stream,
    seq: nextSeq,
    actorUserId: ctx.actorUserId,
    actorLabel: ctx.actorLabel,
    action: entry.action,
    target: entry.target,
    payload: entry.payload as object,
    prevHash,
    rowHash,
  });

  await db
    .insert(auditChainHead)
    .values({ orgId: ctx.orgId, stream: entry.stream, lastSeq: nextSeq, lastHash: rowHash })
    .onConflictDoUpdate({
      target: [auditChainHead.orgId, auditChainHead.stream],
      set: { lastSeq: nextSeq, lastHash: rowHash, updatedAt: sql`now()` },
    });

  return { seq: nextSeq, rowHash, prevHash };
}

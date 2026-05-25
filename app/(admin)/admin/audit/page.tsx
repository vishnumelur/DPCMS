import { db } from '@/db/client';
import { auditLog, auditChainHead, org } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { verifyStream } from '@/lib/audit/verifier';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const [recent, heads, orgs] = await Promise.all([
    db.select().from(auditLog).orderBy(desc(auditLog.ts)).limit(50),
    db.select().from(auditChainHead),
    db.select().from(org),
  ]);

  // Verify every (org, stream) chain end-to-end.
  const verifications = await Promise.all(
    heads.map(async (h) => ({
      orgId: h.orgId,
      stream: h.stream,
      lastSeq: h.lastSeq,
      result: await verifyStream(h.orgId, h.stream),
    })),
  );

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Audit chain</h1>
          <p className="text-sm text-muted-foreground">
            Hash-chained, tamper-evident, court-admissible. Each row carries{' '}
            <code>row_hash = sha256(prev_hash · ts · actor · action · target · canonical_json(payload))</code>.
          </p>
        </div>
        <Badge variant="default">Live · P0</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chain verification</CardTitle>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No streams yet. The first stream appears after the first audited mutation in P1.
            </p>
          ) : (
            <div className="space-y-2">
              {verifications.map((v) => (
                <div
                  key={`${v.orgId}-${v.stream}`}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{orgName(v.orgId)} · {v.stream}</p>
                    <p className="text-xs text-muted-foreground">
                      seq {v.lastSeq} · {v.result.count} row(s)
                    </p>
                  </div>
                  {v.result.ok ? (
                    <Badge variant="default">✓ chain intact</Badge>
                  ) : (
                    <Badge variant="destructive">✗ broken @ idx {v.result.brokenAtIndex} · {v.result.reason}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events ({recent.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No audit events yet. The log fills as the platform records consents, DSRs, breaches.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Stream</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4 font-mono text-xs">{r.ts.toISOString()}</td>
                      <td className="py-2 pr-4">{r.stream}</td>
                      <td className="py-2 pr-4">{r.actorLabel}</td>
                      <td className="py-2 pr-4">{r.action}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.target}</td>
                      <td className="py-2 pr-4 font-mono text-[10px] text-muted-foreground">
                        {r.rowHash.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

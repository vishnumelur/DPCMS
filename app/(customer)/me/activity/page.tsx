import { auth } from '@/auth';
import { db } from '@/db/client';
import { auditLog } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ActivityLogPage() {
  const session = await auth();
  const email = session?.user?.email ?? 'guest';

  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.ts)).limit(50);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
          <p className="text-sm text-muted-foreground">
            Every event recorded about <code>{email}</code> across the platform. Hash-chained,
            tamper-evident.
          </p>
        </div>
        <Badge variant="default">Live · P0</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No events yet — the audit log fills as you use the platform. Try signing out and back in.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Stream</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4 font-mono text-xs">{r.ts.toISOString()}</td>
                      <td className="py-2 pr-4">{r.stream}</td>
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

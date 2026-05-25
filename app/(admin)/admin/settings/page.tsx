import { db } from '@/db/client';
import { org, branch } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [orgs, branches] = await Promise.all([
    db.select().from(org),
    db.select().from(branch),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Tenant configuration — organisation, branches, signing keys, feature flags.
          </p>
        </div>
        <Badge variant="default">Live · P0</Badge>
      </header>

      {orgs.map((o) => (
        <Card key={o.id}>
          <CardHeader>
            <CardTitle className="text-base">{o.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Slug</dt>
                <dd className="font-mono">{o.slug}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Signing key id</dt>
                <dd className="font-mono text-xs">{o.signingKid}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Identifier salt</dt>
                <dd className="font-mono text-xs text-muted-foreground">{o.saltHex.slice(0, 16)}…</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Created</dt>
                <dd>{o.createdAt.toISOString().slice(0, 10)}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Branches ({branches.filter((b) => b.orgId === o.id).length})
              </p>
              <div className="space-y-1">
                {branches
                  .filter((b) => b.orgId === o.id)
                  .map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{b.kind}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

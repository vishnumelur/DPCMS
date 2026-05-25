import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCustomerConsents } from '@/modules/consent/queries';
import { grantConsentAction, withdrawConsentAction } from '@/lib/actions/consent';

export const dynamic = 'force-dynamic';

export default async function MyConsentsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

  const consents = await getCustomerConsents(u.orgId, u.id);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">My consents</h1>
          <p className="text-sm text-muted-foreground">
            Every purpose we process your data for. Each grant or withdrawal is signed (RS256) and
            chained into the immutable audit log — download the artefact any time as evidence.
          </p>
        </div>
        <Badge variant="default">Live · P1</Badge>
      </header>

      <div className="space-y-4">
        {consents.map((row) => {
          const status = row.preference?.status ?? 'never_granted';
          const active = status === 'active';
          const action = active ? withdrawConsentAction : grantConsentAction;
          return (
            <Card key={row.purpose.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{row.purpose.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5">{row.purpose.code}</code> ·{' '}
                      <Badge variant="outline" className="text-[10px]">{row.purpose.lawfulBasis}</Badge>
                    </p>
                  </div>
                  {active ? (
                    <Badge variant="default">Active</Badge>
                  ) : status === 'withdrawn' ? (
                    <Badge variant="destructive">Withdrawn</Badge>
                  ) : (
                    <Badge variant="outline">Not granted</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {row.purpose.description ? (
                  <p className="text-muted-foreground">{row.purpose.description}</p>
                ) : null}
                {row.latestArtefact ? (
                  <details className="rounded border bg-muted/30 p-3">
                    <summary className="cursor-pointer text-xs font-medium">
                      Artefact ({row.latestArtefact.kind}) · body hash{' '}
                      <code className="text-[10px]">
                        {row.latestArtefact.bodyHash.slice(0, 16)}…
                      </code>
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {row.latestArtefact.jws}
                    </pre>
                  </details>
                ) : null}
                <form action={action} className="inline">
                  <input type="hidden" name="purposeId" value={row.purpose.id} />
                  <Button type="submit" variant={active ? 'destructive' : 'default'}>
                    {active ? 'Withdraw' : 'Grant'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { db } from '@/db/client';
import { org, branch, mfaFactor } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ mfa?: string }>;

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const { mfa: mfaFlash } = await searchParams;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [orgs, branches, factorRows] = await Promise.all([
    db.select().from(org),
    db.select().from(branch),
    userId
      ? db
          .select({
            id: mfaFactor.id,
            confirmed: mfaFactor.confirmed,
            createdAt: mfaFactor.createdAt,
            lastUsedAt: mfaFactor.lastUsedAt,
          })
          .from(mfaFactor)
          .where(and(eq(mfaFactor.userId, userId), eq(mfaFactor.confirmed, true)))
          .limit(1)
      : Promise.resolve([] as Array<{ id: string; confirmed: boolean; createdAt: Date; lastUsedAt: Date | null }>),
  ]);

  const enrolledFactor = factorRows[0];

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

      {mfaFlash === 'enabled' ? (
        <p className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          Two-factor authentication is now active for your account.
        </p>
      ) : null}
      {mfaFlash === 'already-enrolled' ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          You&apos;re already enrolled in MFA — nothing to do.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Two-factor authentication (TOTP)</span>
            {enrolledFactor ? (
              <Badge variant="default">Enabled</Badge>
            ) : (
              <Badge variant="outline">Optional</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {enrolledFactor ? (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;ll be prompted for a 6-digit code from your authenticator app
                at every sign-in.
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Enrolled
                  </dt>
                  <dd className="font-mono text-xs">
                    {enrolledFactor.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Last used
                  </dt>
                  <dd className="font-mono text-xs">
                    {enrolledFactor.lastUsedAt
                      ? enrolledFactor.lastUsedAt
                          .toISOString()
                          .slice(0, 19)
                          .replace('T', ' ')
                      : '—'}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                MFA is opt-in for the POC. Once enabled, sign-in will require a
                6-digit code from your authenticator app (Google Authenticator,
                1Password, Authy, etc.). Secret is stored encrypted at rest with
                AES-256-GCM.
              </p>
              <Link
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                href={'/mfa/setup' as any}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Enable MFA for your account
              </Link>
            </>
          )}
        </CardContent>
      </Card>

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

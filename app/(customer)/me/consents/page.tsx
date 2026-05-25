import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCustomerConsents } from '@/modules/consent/queries';
import {
  grantConsentAction,
  withdrawConsentAction,
  grantConsentByGuardianAction,
  declareMinorAction,
} from '@/lib/actions/consent';
import { getMinorFlag } from '@/modules/consent/parental';

export const dynamic = 'force-dynamic';

export default async function MyConsentsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org for current user.</p>;

  const [consents, minorFlag] = await Promise.all([
    getCustomerConsents(u.orgId, u.id),
    getMinorFlag(u.orgId, u.id),
  ]);

  const isMinor = Boolean(minorFlag?.isMinor);
  const needsAgeDeclaration = !minorFlag;

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

      {needsAgeDeclaration ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">One-time: declare your age</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Per DPDP Act §9, if you are under 18 your consent must be granted by a parent or
              lawful guardian. Provide your date of birth to unlock the right consent flow. If you
              are under 18, also enter the guardian who will be giving consent on your behalf.
            </p>
            <form action={declareMinorAction} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" name="dob" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-name">Guardian name (only if under 18)</Label>
                <Input id="g-name" name="guardianName" placeholder="Demo Parent" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-email">Guardian email</Label>
                <Input id="g-email" name="guardianEmail" placeholder="parent@example.in" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-rel">Guardian relation</Label>
                <Input id="g-rel" name="guardianRelation" placeholder="parent / guardian" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save age declaration</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isMinor && minorFlag ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 text-xs">
            Account flagged as <strong>minor</strong> (declared DOB{' '}
            <code>{String(minorFlag.declaredDateOfBirth)}</code>). All consents must be granted by{' '}
            <strong>{minorFlag.guardianName ?? 'your guardian'}</strong>
            {minorFlag.guardianRelation ? ` (${minorFlag.guardianRelation})` : ''}.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {consents.map((row) => {
          const status = row.preference?.status ?? 'never_granted';
          const active = status === 'active';
          let parentalEvidence: Record<string, unknown> | null = null;
          if (row.latestArtefact && 'parentalConsentEvidence' in row.latestArtefact) {
            const raw = (row.latestArtefact as { parentalConsentEvidence?: string | null })
              .parentalConsentEvidence;
            if (raw) {
              try {
                parentalEvidence = JSON.parse(raw) as Record<string, unknown>;
              } catch {
                parentalEvidence = null;
              }
            }
          }
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
                  <div className="flex items-center gap-2">
                    {active ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                        <Badge variant="default">Active</Badge>
                      </>
                    ) : status === 'withdrawn' ? (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                        <Badge variant="destructive">Withdrawn</Badge>
                      </>
                    ) : (
                      <>
                        <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <Badge variant="outline">Not granted</Badge>
                      </>
                    )}
                  </div>
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
                      {parentalEvidence ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          guardian-granted
                        </Badge>
                      ) : null}
                    </summary>
                    {parentalEvidence ? (
                      <div className="mt-2 rounded border bg-background p-2 text-xs">
                        <p className="font-medium">Parental consent evidence</p>
                        <dl className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                          {Object.entries(parentalEvidence).map(([k, v]) => (
                            <div key={k}>
                              <dt className="text-muted-foreground">{k}</dt>
                              <dd className="font-mono">{String(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}
                    <pre className="mt-2 max-h-48 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {row.latestArtefact.jws}
                    </pre>
                  </details>
                ) : null}

                {active ? (
                  <form action={withdrawConsentAction} className="inline">
                    <input type="hidden" name="purposeId" value={row.purpose.id} />
                    <Button type="submit" variant="destructive">
                      Withdraw
                    </Button>
                  </form>
                ) : isMinor ? (
                  <details className="rounded border bg-muted/30 p-3">
                    <summary className="cursor-pointer text-xs font-medium">
                      Request guardian consent →
                    </summary>
                    <form
                      action={grantConsentByGuardianAction}
                      className="mt-3 grid gap-2 md:grid-cols-3"
                    >
                      <input type="hidden" name="purposeId" value={row.purpose.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`gn-${row.purpose.id}`} className="text-[11px]">
                          Guardian name
                        </Label>
                        <Input
                          id={`gn-${row.purpose.id}`}
                          name="guardianName"
                          required
                          defaultValue={minorFlag?.guardianName ?? ''}
                          placeholder="Demo Parent"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ge-${row.purpose.id}`} className="text-[11px]">
                          Guardian email
                        </Label>
                        <Input
                          id={`ge-${row.purpose.id}`}
                          name="guardianEmail"
                          required
                          type="email"
                          defaultValue={minorFlag?.guardianEmail ?? ''}
                          placeholder="parent@example.in"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`gr-${row.purpose.id}`} className="text-[11px]">
                          Relation
                        </Label>
                        <Input
                          id={`gr-${row.purpose.id}`}
                          name="guardianRelation"
                          required
                          defaultValue={minorFlag?.guardianRelation ?? 'parent'}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Button type="submit">Grant via guardian</Button>
                      </div>
                    </form>
                  </details>
                ) : (
                  <form action={grantConsentAction} className="inline">
                    <input type="hidden" name="purposeId" value={row.purpose.id} />
                    <Button type="submit">Grant</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

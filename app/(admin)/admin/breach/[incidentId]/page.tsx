import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, breachNotification, breachCohort } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getIncident,
  listActions,
  generateDpbReport,
  BREACH_SEVERITIES,
} from '@/modules/breach/service';
import {
  setSeverityAction,
  containAction,
  notifyDpbAction,
  closeAction,
} from '@/lib/actions/breach';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  detected: 'destructive',
  assessing: 'secondary',
  contained: 'secondary',
  reported_dpb: 'default',
  closed: 'outline',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

type PageProps = {
  params: Promise<{ incidentId: string }>;
  searchParams: Promise<{ generate?: string }>;
};

export default async function AdminBreachDetailPage({ params, searchParams }: PageProps) {
  const { incidentId } = await params;
  const sp = await searchParams;
  const showReport = sp.generate === '1';

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const incident = await getIncident(u.orgId, incidentId);
  if (!incident) return notFound();

  const [actions, notifications, cohort] = await Promise.all([
    listActions(incident.id),
    db.select().from(breachNotification).where(eq(breachNotification.incidentId, incident.id)),
    db.select().from(breachCohort).where(eq(breachCohort.incidentId, incident.id)),
  ]);

  const report = showReport ? await generateDpbReport(u.orgId, incident.id) : null;
  const isTerminal = incident.status === 'closed';

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/admin/breach' as any} className="text-xs underline">
            ← Back to incidents
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{incident.title}</h1>
          <p className="text-sm text-muted-foreground">
            Detected {incident.detectedAt.toISOString().slice(0, 16).replace('T', ' ')} ·
            deadline {incident.reportingDeadlineAt?.toISOString().slice(0, 16).replace('T', ' ') ?? '—'}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <Badge variant={STATUS_VARIANT[incident.status] ?? 'outline'}>{incident.status}</Badge>
          <div>
            <Badge
              variant={SEVERITY_VARIANT[incident.severity] ?? 'outline'}
              className="text-[10px] uppercase"
            >
              {incident.severity}
            </Badge>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{incident.description}</p>
          <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Estimated affected</dt>
              <dd>{incident.estimatedAffectedCount.toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Affected categories</dt>
              <dd>{incident.affectedDataCategories.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Cohort built</dt>
              <dd>{cohort.length.toLocaleString('en-IN')} principal(s)</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Notifications recorded</dt>
              <dd>{notifications.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {!isTerminal && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Set severity</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={setSeverityAction} className="space-y-3">
                <input type="hidden" name="incidentId" value={incident.id} />
                <div className="space-y-1">
                  <Label htmlFor="severity">Severity</Label>
                  <select
                    id="severity"
                    name="severity"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={incident.severity}
                  >
                    {BREACH_SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" placeholder="Why this severity?" />
                </div>
                <Button type="submit">Update severity</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mark contained</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={containAction} className="space-y-3">
                <input type="hidden" name="incidentId" value={incident.id} />
                <div className="space-y-1">
                  <Label htmlFor="notes-c">Containment notes</Label>
                  <Input id="notes-c" name="notes" placeholder="Patched, keys rotated, cohort isolated…" />
                </div>
                <Button type="submit">Mark contained</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate DPB report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Renders the draft notification per DPDP Rules 2025 (POC placeholder).
              </p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link href={`/admin/breach/${incident.id}?generate=1` as any}>
                <Button>Generate DPB report</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notify DPB & close</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={notifyDpbAction} className="space-y-2">
                <input type="hidden" name="incidentId" value={incident.id} />
                <Button type="submit" variant="default">
                  Record DPB notification (stub)
                </Button>
              </form>
              <form action={closeAction} className="space-y-2">
                <input type="hidden" name="incidentId" value={incident.id} />
                <div className="space-y-1">
                  <Label htmlFor="rootCause">Root cause (required to close)</Label>
                  <Input id="rootCause" name="rootCause" placeholder="Mis-configured S3 ACL" />
                </div>
                <Button type="submit" variant="destructive">
                  Close incident
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DPB notification draft</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Copy and submit through the DPB portal once the official form is notified.{' '}
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(report)}`}
                download={`dpb-report-${incident.id}.md`}
                className="underline"
              >
                Download Markdown
              </a>
            </p>
            <pre className="overflow-x-auto rounded bg-muted p-4 text-[11px] leading-relaxed">
              {report}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Action timeline ({actions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {actions.map((a) => (
                <li key={a.id} className="rounded border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{a.createdAt.toISOString()}</span>
                    <span>{a.kind}</span>
                  </div>
                  <p className="mt-1">{a.notes}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

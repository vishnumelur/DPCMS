import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, purpose } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getActivity } from '@/modules/ropa/service';
import { updateActivityAction } from '@/lib/actions/ropa';
import { createAssessmentAction } from '@/lib/actions/assessment';
import { LEGAL_BASES } from '@/modules/assessment/templates';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ activityId: string }> };

export default async function ActivityDetailPage({ params }: PageProps) {
  const { activityId } = await params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const activity = await getActivity(u.orgId, activityId);
  if (!activity) return notFound();

  const linkedPurpose = activity.purposeId
    ? (
        await db.select().from(purpose).where(eq(purpose.id, activity.purposeId)).limit(1)
      )[0]
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/admin/data-mapping' as any} className="text-xs underline">
            ← Back to RoPA
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{activity.name}</h1>
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        </div>
        <div className="space-y-1 text-right">
          <Badge variant="outline" className="text-[10px]">
            {activity.legalBasis}
          </Badge>
          {activity.crossBorder && (
            <div>
              <Badge variant="destructive" className="text-[10px]">
                cross-border
              </Badge>
            </div>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Linked purpose" value={linkedPurpose ? `${linkedPurpose.code} — ${linkedPurpose.name}` : '—'} />
            <Row label="System of record" value={activity.systemOfRecord || '—'} />
            <Row label="Retention" value={`${activity.retentionPeriodMonths} months`} />
            <Row label="Retention rationale" value={activity.retentionRationale || '—'} />
            <Row label="Data categories" value={activity.dataCategories.join(', ') || '—'} />
            <Row label="Data subjects" value={activity.dataSubjects.join(', ') || '—'} />
            <Row label="Recipients" value={activity.recipients.join(', ') || '—'} />
            <Row label="Cross-border" value={activity.crossBorder ? 'yes' : 'no'} />
            <Row
              label="Owner"
              value={activity.ownerUserId ? `user ${activity.ownerUserId.slice(0, 8)}…` : 'unassigned'}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create assessments for this activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={createAssessmentAction} className="space-y-2">
              <input type="hidden" name="kind" value="pia" />
              <input type="hidden" name="processingActivityId" value={activity.id} />
              <input
                type="hidden"
                name="title"
                value={`PIA — ${activity.name}`}
              />
              <input
                type="hidden"
                name="description"
                value={`PIA created from RoPA activity ${activity.name}.`}
              />
              <Button type="submit" variant="default" className="w-full">
                Create PIA for this activity
              </Button>
            </form>
            <form action={createAssessmentAction} className="space-y-2">
              <input type="hidden" name="kind" value="dpia" />
              <input type="hidden" name="processingActivityId" value={activity.id} />
              <input
                type="hidden"
                name="title"
                value={`DPIA — ${activity.name}`}
              />
              <input
                type="hidden"
                name="description"
                value={`DPIA created from RoPA activity ${activity.name}.`}
              />
              <Button type="submit" variant="secondary" className="w-full">
                Create DPIA for this activity
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit this activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateActivityAction} className="grid gap-2">
              <input type="hidden" name="id" value={activity.id} />
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={activity.name} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={activity.description} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="legalBasis">Legal basis</Label>
                  <select
                    id="legalBasis"
                    name="legalBasis"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue={activity.legalBasis}
                  >
                    {LEGAL_BASES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="systemOfRecord">System of record</Label>
                  <Input
                    id="systemOfRecord"
                    name="systemOfRecord"
                    defaultValue={activity.systemOfRecord}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retentionPeriodMonths">Retention (months)</Label>
                  <Input
                    id="retentionPeriodMonths"
                    name="retentionPeriodMonths"
                    type="number"
                    min={0}
                    defaultValue={activity.retentionPeriodMonths}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retentionRationale">Retention rationale</Label>
                  <Input
                    id="retentionRationale"
                    name="retentionRationale"
                    defaultValue={activity.retentionRationale}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataCategories">Data categories (comma-separated)</Label>
                <Input
                  id="dataCategories"
                  name="dataCategories"
                  defaultValue={activity.dataCategories.join(', ')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataSubjects">Data subjects (comma-separated)</Label>
                <Input
                  id="dataSubjects"
                  name="dataSubjects"
                  defaultValue={activity.dataSubjects.join(', ')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recipients">Recipients (comma-separated)</Label>
                <Input
                  id="recipients"
                  name="recipients"
                  defaultValue={activity.recipients.join(', ')}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="crossBorder"
                  name="crossBorder"
                  type="checkbox"
                  defaultChecked={activity.crossBorder}
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="crossBorder">Cross-border transfer involved</Label>
              </div>
              <div>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

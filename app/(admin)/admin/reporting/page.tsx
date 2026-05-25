import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gatherReportingSnapshot } from '@/lib/reporting/aggregate';
import { summariseStatus } from '@/lib/rfp/matrix-data';
import {
  ConsentDonut,
  CountBarChart,
  DayLineChart,
  RfpCoverageBar,
} from '@/components/reporting/charts';

export const dynamic = 'force-dynamic';

export default async function AdminReportingPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const snapshot = await gatherReportingSnapshot(u.orgId);
  const rfp = summariseStatus();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M10 · Reports & dashboards</h1>
          <p className="text-sm text-muted-foreground">
            Privacy posture at a glance. KPIs aggregate the audit, consent, DSR, breach and
            connector streams. Generated{' '}
            <code className="rounded bg-muted px-1 text-[10px]">{snapshot.generatedAt}</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">Live · P5</Badge>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/api/reports/board-pack' as any} prefetch={false} target="_blank" rel="noopener">
            <Button variant="outline" size="sm">
              Export board pack (JSON)
            </Button>
          </Link>
        </div>
      </header>

      <section
        data-testid="reporting-kpis"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      >
        <Kpi label="Consent artefacts" value={snapshot.kpis.totalArtefacts} hint="lifetime" />
        <Kpi label="Active consents" value={snapshot.kpis.activeConsents} hint="current state" />
        <Kpi label="Withdrawn" value={snapshot.kpis.withdrawnConsents} hint="current state" />
        <Kpi label="Open DSRs" value={snapshot.kpis.openDsrs} hint="awaiting fulfilment" />
        <Kpi label="Breach incidents" value={snapshot.kpis.breachIncidents} hint="all severities" />
        <Kpi label="Audit events" value={snapshot.kpis.auditEvents} hint="hash-chained" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consent state</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsentDonut data={snapshot.consentByStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">DSRs by kind</CardTitle>
          </CardHeader>
          <CardContent>
            <CountBarChart data={snapshot.dsrByKind} color="#a855f7" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breach severity</CardTitle>
          </CardHeader>
          <CardContent>
            <CountBarChart data={snapshot.breachBySeverity} color="#ef4444" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connector events (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <DayLineChart data={snapshot.connectorEventsByDay} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">RFP coverage progress</CardTitle>
        </CardHeader>
        <CardContent>
          <RfpCoverageBar ra={rfp.RA} ca={rfp.CA} na={rfp.NA} />
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground">
        Reads from the same Drizzle/Neon dataset shown across the admin portal. Board-pack JSON
        bundles the KPI numbers + per-module RA/CA/NA counts for offline review.
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-3xl font-semibold">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

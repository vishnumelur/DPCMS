import { auth } from '@/auth';
import { db } from '@/db/client';
import { org, branch, user, role, permission, auditLog } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { summariseStatus, RFP_REQUIREMENTS } from '@/lib/rfp/matrix-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function countTable(table: typeof org | typeof branch | typeof user | typeof role | typeof permission | typeof auditLog): Promise<number> {
  const r = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return r[0]?.n ?? 0;
}

export default async function AdminHome() {
  const session = await auth();
  const email = session?.user?.email ?? 'admin';

  const [orgs, branches, users, roles, perms, audits] = await Promise.all([
    countTable(org),
    countTable(branch),
    countTable(user),
    countTable(role),
    countTable(permission),
    countTable(auditLog),
  ]);

  const rfp = summariseStatus();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Compliance dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <code>{email}</code> · DPO · global scope
          </p>
        </div>
        <Badge variant="default">Live · P0</Badge>
      </header>

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Orgs" value={orgs} />
        <Stat label="Branches" value={branches} />
        <Stat label="Users" value={users} />
        <Stat label="Roles" value={roles} />
        <Stat label="Permissions" value={perms} />
        <Stat label="Audit events" value={audits} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RFP compliance posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Stat compact label="RA" value={rfp.RA} tone="default" />
              <Stat compact label="CA" value={rfp.CA} tone="secondary" />
              <Stat compact label="NA" value={rfp.NA} tone="destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              {RFP_REQUIREMENTS.length} representative requirements mapped. More land per-phase.
            </p>
            <Link href="/rfp-matrix" className="text-sm font-medium underline">Open matrix →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What&apos;s live in P0</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✔ Hash-chained audit log — <Link href="/admin/audit" className="underline">view chain</Link></li>
              <li>✔ RBAC roles + permissions — <Link href="/admin/rbac" className="underline">viewer</Link></li>
              <li>✔ Tenancy + branches — <Link href="/admin/settings" className="underline">settings</Link></li>
              <li>✔ Credentials auth + JWT sessions</li>
              <li>✔ Generic workflow engine (TDD&apos;d, awaiting flow definitions in P2)</li>
              <li>✔ AI gateway wrapper + PII redactor (gated by AI_GATEWAY_API_KEY)</li>
              <li>✔ next-intl with 22 locale skeleton (en · ml · hi authored)</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, compact, tone = 'outline' }: { label: string; value: number; compact?: boolean; tone?: 'default' | 'secondary' | 'destructive' | 'outline' }) {
  return (
    <Card className={compact ? 'flex-1' : ''}>
      <CardContent className={compact ? 'space-y-1 pt-4 pb-3' : 'space-y-1 pt-6'}>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          {compact ? <Badge variant={tone} className="text-[10px]">{label}</Badge> : null}
        </div>
        <p className={compact ? 'text-xl font-semibold' : 'text-3xl font-semibold'}>{value}</p>
      </CardContent>
    </Card>
  );
}

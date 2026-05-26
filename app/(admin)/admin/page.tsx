import { auth } from '@/auth';
import { db } from '@/db/client';
import {
  org,
  branch,
  user,
  role,
  permission,
  auditLog,
  consentArtefact,
  consentPreference,
  dsrRequest,
  breachIncident,
} from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { summariseStatus, RFP_REQUIREMENTS } from '@/lib/rfp/matrix-data';
import { HeroMesh } from '@/components/dashboard/hero-mesh';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RfpProgress } from '@/components/dashboard/rfp-progress';
import { WhatsLive } from '@/components/dashboard/whats-live';
import {
  Activity,
  FileCheck2,
  Users,
  ShieldAlert,
  Building2,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Layers,
  FileText,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type Table = Parameters<typeof db.select>[0] extends never
  ? never
  : Parameters<typeof db.select>[0];

async function countTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
): Promise<number> {
  const r = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return r[0]?.n ?? 0;
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export default async function AdminHome() {
  const session = await auth();
  const email = session?.user?.email ?? 'admin';

  const [
    orgs,
    branches,
    users,
    roles,
    perms,
    audits,
    activeConsents,
    openDsrs,
    breachIncidents,
    orgRow,
  ] = await Promise.all([
    countTable(org),
    countTable(branch),
    countTable(user),
    countTable(role),
    countTable(permission),
    countTable(auditLog),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(consentPreference)
      .where(eq(consentPreference.status, 'active'))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(dsrRequest)
      .where(sql`${dsrRequest.status} not in ('fulfilled', 'rejected')`)
      .then((r) => r[0]?.n ?? 0),
    countTable(breachIncident),
    db.select().from(org).limit(1).then((r) => r[0]),
  ]);

  // Also surface a second-tier count for context.
  const totalArtefacts = await countTable(consentArtefact);

  const rfp = summariseStatus();
  const phases = [
    { key: 'P0', label: 'Foundation', pct: 100 },
    { key: 'P1', label: 'Consent core', pct: 100 },
    { key: 'P2', label: 'Rights & breach', pct: 100 },
    { key: 'P3', label: 'Assessments', pct: 100 },
    { key: 'P4', label: 'Integrations', pct: 100 },
    { key: 'P5', label: 'Reporting & polish', pct: 100 },
  ];

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Hero */}
      <HeroMesh
        greeting={`${timeOfDayGreeting()} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}`}
        email={email}
        role="DPO"
        scope="global"
        orgName={orgRow?.name ?? 'KSCB'}
        uptime="All systems operational"
      />

      {/* Primary KPIs — 4 across, bento-style, featured cards have gradient borders */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            At a glance
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Live · Neon · India
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <KpiCard
            label="Audit events"
            value={audits}
            hint="hash-chained"
            icon={<Activity className="h-4 w-4" />}
            href="/admin/audit"
            featured
            delay={60}
          />
          <KpiCard
            label="Active consents"
            value={activeConsents}
            hint={`${totalArtefacts} artefacts lifetime`}
            icon={<FileCheck2 className="h-4 w-4" />}
            href="/admin/consents"
            delay={120}
          />
          <KpiCard
            label="Open DSRs"
            value={openDsrs}
            hint="awaiting fulfilment"
            icon={<UserCheck className="h-4 w-4" />}
            href="/admin/dsr"
            delay={180}
          />
          <KpiCard
            label="Breach incidents"
            value={breachIncidents}
            hint="all severities, all time"
            icon={<ShieldAlert className="h-4 w-4" />}
            href="/admin/breach"
            delay={240}
          />
        </div>
      </section>

      {/* RFP progress + What's live — 2 column on lg, stacked on mobile */}
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <RfpProgress
          ra={rfp.RA}
          ca={rfp.CA}
          na={rfp.NA}
          total={RFP_REQUIREMENTS.length}
          phases={phases}
          delay={320}
        />
        <WhatsLive delay={400} />
      </section>

      {/* Secondary — tenancy footprint (small tiles) */}
      <section className="space-y-4">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Tenant footprint
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniTile label="Orgs"        value={orgs}     icon={<Building2 className="h-3.5 w-3.5" />}    delay={500} />
          <MiniTile label="Branches"    value={branches} icon={<Layers className="h-3.5 w-3.5" />}        delay={540} href="/admin/settings" />
          <MiniTile label="Users"       value={users}    icon={<Users className="h-3.5 w-3.5" />}         delay={580} href="/admin/rbac" />
          <MiniTile label="Roles"       value={roles}    icon={<ShieldCheck className="h-3.5 w-3.5" />}   delay={620} href="/admin/rbac" />
          <MiniTile label="Permissions" value={perms}    icon={<KeyRound className="h-3.5 w-3.5" />}      delay={660} href="/admin/rbac" />
          <MiniTile label="Reports"     value="—"        icon={<FileText className="h-3.5 w-3.5" />}      delay={700} href="/admin/reporting" />
        </div>
      </section>
    </div>
  );
}

function MiniTile({
  label,
  value,
  icon,
  href,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  delay?: number;
}) {
  const inner = (
    <div
      className="group rounded-xl border border-border/60 bg-card px-4 py-3 card-lift fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{icon}</span>
        <span className="text-[9px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-light tabular tracking-tight">{value}</p>
    </div>
  );
  if (!href) return inner;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // dynamic typed-routes target
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <a href={href} className="block">
      {inner}
    </a>
  );
}

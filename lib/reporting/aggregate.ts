import { db } from '@/db/client';
import {
  auditLog,
  breachIncident,
  connectorEvent,
  consentArtefact,
  consentPreference,
  dsrRequest,
} from '@/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

export type ReportingKpis = {
  totalArtefacts: number;
  activeConsents: number;
  withdrawnConsents: number;
  openDsrs: number;
  breachIncidents: number;
  auditEvents: number;
};

export type CountBucket = { label: string; count: number };
export type DayBucket = { day: string; count: number };

export type ReportingSnapshot = {
  generatedAt: string;
  kpis: ReportingKpis;
  consentByStatus: CountBucket[];
  dsrByKind: CountBucket[];
  breachBySeverity: CountBucket[];
  connectorEventsByDay: DayBucket[];
};

const OPEN_DSR_STATES = ['received', 'identity_verified', 'in_review', 'info_requested', 'escalated'] as const;

export async function gatherReportingSnapshot(orgId: string): Promise<ReportingSnapshot> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [artefactRows, activeRows, withdrawnRows, openDsrRows, breachRows, auditRows] =
    await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(consentArtefact)
        .where(eq(consentArtefact.orgId, orgId)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(consentPreference)
        .where(and(eq(consentPreference.orgId, orgId), eq(consentPreference.status, 'active'))),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(consentPreference)
        .where(and(eq(consentPreference.orgId, orgId), eq(consentPreference.status, 'withdrawn'))),
      db
        .select({ status: dsrRequest.status, c: sql<number>`count(*)::int` })
        .from(dsrRequest)
        .where(eq(dsrRequest.orgId, orgId))
        .groupBy(dsrRequest.status),
      db
        .select({ severity: breachIncident.severity, c: sql<number>`count(*)::int` })
        .from(breachIncident)
        .where(eq(breachIncident.orgId, orgId))
        .groupBy(breachIncident.severity),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(eq(auditLog.orgId, orgId)),
    ]);

  const dsrByKindRows = await db
    .select({ kind: dsrRequest.kind, c: sql<number>`count(*)::int` })
    .from(dsrRequest)
    .where(eq(dsrRequest.orgId, orgId))
    .groupBy(dsrRequest.kind);

  const eventsByDay = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${connectorEvent.createdAt}), 'YYYY-MM-DD')`,
      c: sql<number>`count(*)::int`,
    })
    .from(connectorEvent)
    .where(
      and(eq(connectorEvent.orgId, orgId), gte(connectorEvent.createdAt, sevenDaysAgo)),
    )
    .groupBy(sql`date_trunc('day', ${connectorEvent.createdAt})`)
    .orderBy(sql`date_trunc('day', ${connectorEvent.createdAt})`);

  const totalArtefacts = artefactRows[0]?.c ?? 0;
  const activeConsents = activeRows[0]?.c ?? 0;
  const withdrawnConsents = withdrawnRows[0]?.c ?? 0;
  const auditEvents = auditRows[0]?.c ?? 0;

  // Materialise the 7-day window even if some days have zero events.
  const eventsByDayMap = new Map(eventsByDay.map((r) => [r.day, r.c]));
  const connectorEventsByDay: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    connectorEventsByDay.push({ day: key, count: eventsByDayMap.get(key) ?? 0 });
  }

  const openSet = new Set<string>(OPEN_DSR_STATES);
  const openDsrs = openDsrRows
    .filter((r) => openSet.has(r.status))
    .reduce((acc, r) => acc + r.c, 0);

  const breachIncidents = breachRows.reduce((acc, r) => acc + r.c, 0);

  return {
    generatedAt: now.toISOString(),
    kpis: {
      totalArtefacts,
      activeConsents,
      withdrawnConsents,
      openDsrs,
      breachIncidents,
      auditEvents,
    },
    consentByStatus: [
      { label: 'Active', count: activeConsents },
      { label: 'Withdrawn', count: withdrawnConsents },
    ],
    dsrByKind: dsrByKindRows.map((r) => ({ label: r.kind, count: r.c })),
    breachBySeverity: breachRows.map((r) => ({ label: r.severity, count: r.c })),
    connectorEventsByDay,
  };
}

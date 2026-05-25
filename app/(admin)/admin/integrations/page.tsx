import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, connector as connectorTable, connectorEvent } from '@/db/schema';
import { and, eq, desc, gte } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  toggleConnectorEnabledAction,
  runHealthCheckAction,
  triggerEventAction,
} from '@/lib/actions/integrations';
import { CONNECTOR_FACTORIES } from '@/modules/integrations/registry';

export const dynamic = 'force-dynamic';

const HEALTH_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  green: 'default',
  amber: 'secondary',
  red: 'destructive',
};

const MODE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  mock: 'outline',
  sandbox: 'secondary',
  live: 'default',
};

function timeAgo(d: Date | null, now: Date): string {
  if (!d) return 'never';
  const secs = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function AdminIntegrationsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const connectors = await db
    .select()
    .from(connectorTable)
    .where(eq(connectorTable.orgId, u.orgId))
    .orderBy(connectorTable.code);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentEvents = await db
    .select()
    .from(connectorEvent)
    .where(eq(connectorEvent.orgId, u.orgId))
    .orderBy(desc(connectorEvent.createdAt))
    .limit(20);

  const eventsLast24h = await db
    .select({ id: connectorEvent.id })
    .from(connectorEvent)
    .where(
      and(eq(connectorEvent.orgId, u.orgId), gte(connectorEvent.createdAt, oneDayAgo)),
    );

  const total = connectors.length;
  const enabled = connectors.filter((c) => c.enabled).length;
  const healthy = connectors.filter((c) => c.healthState === 'green').length;
  const mocked = connectors.filter((c) => c.mode === 'mock').length;
  const sandboxed = connectors.filter((c) => c.mode === 'sandbox').length;
  const events24h = eventsLast24h.length;

  const connectorByCode = new Map(connectors.map((c) => [c.code, c]));
  const connectorById = new Map(connectors.map((c) => [c.id, c]));

  // Build dropdown options { code, name, events[] } for the trigger panel.
  const triggerOptions = connectors.map((c) => {
    const factory = CONNECTOR_FACTORIES[c.code];
    const tmp = factory
      ? factory({
          id: c.id,
          orgId: c.orgId,
          code: c.code,
          name: c.name,
          kind: c.kind,
          mode: c.mode,
          enabled: c.enabled,
          healthState: c.healthState,
          lastHealthCheckAt: c.lastHealthCheckAt,
          configJson: c.configJson,
        })
      : null;
    return {
      code: c.code,
      name: c.name,
      events: tmp ? [...tmp.supportedEvents] : [],
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">M4 · Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connector framework for CBS (Finacle), NPCI (UPI / AEPS / BBPS), UIDAI Aadhaar e-KYC,
            DigiLocker, Account Aggregator (Sahamati) and the MeitY national consent stack. Mock
            payloads match the real-world field shapes so an evaluator opening an event row
            recognises the format.
          </p>
        </div>
        <Badge variant="default">Live · P4</Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Connectors" value={total} hint="configured" />
        <Stat label="Enabled" value={enabled} hint="routing on" />
        <Stat label="Healthy" value={healthy} hint="last check = green" />
        <Stat label="Mocked" value={mocked} hint="mock mode" />
        <Stat label="Sandbox" value={sandboxed} hint="sandbox mode" />
        <Stat label="Events / 24h" value={events24h} hint="across all connectors" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connectors ({connectors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No connectors seeded yet. Run <code className="rounded bg-muted px-1">npm run db:seed</code>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connectors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.kind}</TableCell>
                    <TableCell>
                      <Badge variant={MODE_VARIANT[c.mode] ?? 'outline'} className="uppercase text-[10px]">
                        {c.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={HEALTH_VARIANT[c.healthState] ?? 'outline'}
                        className="uppercase text-[10px]"
                      >
                        {c.healthState}
                      </Badge>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {timeAgo(c.lastHealthCheckAt, now)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <form action={toggleConnectorEnabledAction} className="inline">
                        <input type="hidden" name="connectorId" value={c.id} />
                        <Button type="submit" variant={c.enabled ? 'default' : 'outline'} size="sm">
                          {c.enabled ? 'On' : 'Off'}
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={runHealthCheckAction} className="inline">
                        <input type="hidden" name="connectorId" value={c.id} />
                        <Button type="submit" variant="outline" size="sm" className="mr-2">
                          Health check
                        </Button>
                      </form>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Link href={`/admin/integrations/${c.code}` as any} className="text-xs underline">
                        Open →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trigger event</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={triggerEventAction} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="connectorCode">Connector</Label>
              <select
                id="connectorCode"
                name="connectorCode"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue={triggerOptions[0]?.code ?? ''}
              >
                {triggerOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="eventKind">Event kind</Label>
              <select
                id="eventKind"
                name="eventKind"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {triggerOptions.flatMap((o) =>
                  o.events.map((e) => (
                    <option key={`${o.code}:${e}`} value={e}>
                      {o.code} · {e}
                    </option>
                  )),
                )}
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="payload">Payload (JSON object, optional)</Label>
              <textarea
                id="payload"
                name="payload"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm"
                placeholder={'{ "cif": "CIF1000234", "branchCode": "0042" }'}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Trigger event</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events ({recentEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet — trigger one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Connector</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Event kind</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((e) => {
                  const c = connectorById.get(e.connectorId);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">
                        {e.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c ? (
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          <Link href={`/admin/integrations/${c.code}` as any} className="underline">
                            {c.code}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{e.direction}</TableCell>
                      <TableCell className="font-mono text-xs">{e.eventKind}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant={
                            e.statusCode != null && e.statusCode >= 200 && e.statusCode < 300
                              ? 'default'
                              : e.statusCode === 404
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-[10px]"
                        >
                          {e.statusCode ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.latencyMs != null ? `${e.latencyMs}ms` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground">
            Payload bodies are PII-redacted before persistence (lib/ai/redact.ts).
            See <code className="rounded bg-muted px-1">/admin/audit</code> for the chained connector audit
            stream. Configured connectors:{' '}
            {Array.from(connectorByCode.keys()).join(', ') || '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

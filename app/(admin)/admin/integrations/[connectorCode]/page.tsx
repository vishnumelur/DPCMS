import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import {
  user,
  connector as connectorTable,
  connectorEvent,
  consentEnforcementCheck,
  purpose as purposeTable,
} from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  setConnectorModeAction,
  replayEventAction,
  validateConsentAction,
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

type PageProps = {
  params: Promise<{ connectorCode: string }>;
};

export default async function AdminIntegrationDetailPage({ params }: PageProps) {
  const { connectorCode } = await params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const rows = await db
    .select()
    .from(connectorTable)
    .where(and(eq(connectorTable.orgId, u.orgId), eq(connectorTable.code, connectorCode)))
    .limit(1);
  const c = rows[0];
  if (!c) return notFound();

  const [events, checks, purposes] = await Promise.all([
    db
      .select()
      .from(connectorEvent)
      .where(eq(connectorEvent.connectorId, c.id))
      .orderBy(desc(connectorEvent.createdAt))
      .limit(50),
    db
      .select()
      .from(consentEnforcementCheck)
      .where(eq(consentEnforcementCheck.connectorId, c.id))
      .orderBy(desc(consentEnforcementCheck.createdAt))
      .limit(20),
    db.select().from(purposeTable).where(eq(purposeTable.orgId, u.orgId)),
  ]);

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
  const supportsConsent = Boolean(tmp?.validateConsent);
  const supportedEvents = tmp ? [...tmp.supportedEvents] : [];

  // Mask anything that smells like a secret in configJson.
  const configRedacted = redactConfig(c.configJson);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/admin/integrations' as any} className="text-xs underline">
            ← Back to connectors
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {c.name} <code className="ml-1 text-base">({c.code})</code>
          </h1>
          <p className="text-sm text-muted-foreground">
            Kind: {c.kind}. Supported events:{' '}
            <code className="rounded bg-muted px-1">{supportedEvents.join(', ') || '—'}</code>.
          </p>
        </div>
        <div className="space-y-1 text-right">
          <Badge variant={MODE_VARIANT[c.mode] ?? 'outline'} className="uppercase">
            {c.mode}
          </Badge>
          <div>
            <Badge variant={HEALTH_VARIANT[c.healthState] ?? 'outline'} className="uppercase text-[10px]">
              {c.healthState}
            </Badge>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Last check:{' '}
              {c.lastHealthCheckAt
                ? c.lastHealthCheckAt.toISOString().slice(0, 19).replace('T', ' ')
                : 'never'}
            </p>
            <form action={runHealthCheckAction}>
              <input type="hidden" name="connectorId" value={c.id} />
              <Button type="submit" variant="outline" size="sm">
                Run health check now
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enabled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Disabled connectors stay in the registry but refuse calls.
            </p>
            <form action={toggleConnectorEnabledAction}>
              <input type="hidden" name="connectorId" value={c.id} />
              <Button type="submit" variant={c.enabled ? 'default' : 'outline'} size="sm">
                {c.enabled ? 'Currently ON — click to disable' : 'Currently OFF — click to enable'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={setConnectorModeAction} className="space-y-3">
              <input type="hidden" name="connectorId" value={c.id} />
              <select
                name="mode"
                defaultValue={c.mode}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="mock">mock</option>
                <option value="sandbox">sandbox (requires config)</option>
                <option value="live">live (requires config)</option>
              </select>
              <Button type="submit" size="sm">
                Apply mode
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Sandbox / live error out gracefully until a config blob is supplied.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration (redacted)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
            {JSON.stringify(configRedacted, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {supportsConsent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validate consent</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={validateConsentAction} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="connectorId" value={c.id} />
              <div className="space-y-1">
                <Label htmlFor="purposeCode">Purpose code</Label>
                <select
                  id="purposeCode"
                  name="purposeCode"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue={purposes[0]?.code ?? ''}
                >
                  {purposes.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="principalUserId">Principal user ID (optional)</Label>
                <Input
                  id="principalUserId"
                  name="principalUserId"
                  placeholder="leave blank for anonymous"
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" variant="outline">
                  Check
                </Button>
              </div>
            </form>
            {checks.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Recent consent checks</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checks.map((chk) => (
                      <TableRow key={chk.id}>
                        <TableCell className="font-mono text-xs">
                          {chk.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{chk.purposeCode}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {chk.principalUserId ?? 'anonymous'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={chk.decision === 'allow' ? 'default' : 'destructive'}
                            className="uppercase text-[10px]"
                          >
                            {chk.decision}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{chk.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event history ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events for this connector yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <details key={e.id} className="rounded border p-3 text-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {e.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {e.direction}
                      </Badge>
                      <span className="font-mono text-xs">{e.eventKind}</span>
                      <Badge
                        variant={
                          e.statusCode != null && e.statusCode >= 200 && e.statusCode < 300
                            ? 'default'
                            : 'destructive'
                        }
                        className="text-[10px]"
                      >
                        {e.statusCode ?? '—'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {e.latencyMs != null ? `${e.latencyMs}ms` : ''}
                      </span>
                    </div>
                    <form action={replayEventAction} className="inline">
                      <input type="hidden" name="eventId" value={e.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Replay
                      </Button>
                    </form>
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto rounded bg-muted p-3 text-[10px] leading-relaxed">
                    {JSON.stringify(e.payloadRedacted, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function redactConfig(cfg: unknown): unknown {
  if (cfg == null || typeof cfg !== 'object') return cfg;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg as Record<string, unknown>)) {
    if (/key|secret|token|password|cred/i.test(k)) {
      out[k] = typeof v === 'string' ? '[REDACTED]' : '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

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
  markMeityReadyAction,
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

      {c.code === 'meity_consent_stack' && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">
              MeitY National Consent Stack — ready when GoI publishes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              The Government of India has published the Business Requirements Document for a
              national consent stack under the Digital Personal Data Protection Act 2023. The
              production endpoint is not yet live. This connector is wired and aligned to the
              expected DEPA v1.1 artefact contract so production switchover is config-only — no
              code change required when the endpoint becomes available.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border bg-background p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Expected endpoints (pending GoI publication)
                </p>
                <ul className="mt-2 space-y-1 font-mono text-[11px]">
                  <li><span className="text-muted-foreground">POST</span> /consent/notice/publish</li>
                  <li><span className="text-muted-foreground">POST</span> /consent/request</li>
                  <li><span className="text-muted-foreground">GET</span>  /consent/{'{consentId}'}</li>
                  <li><span className="text-muted-foreground">POST</span> /consent/{'{consentId}'}/revoke</li>
                  <li><span className="text-muted-foreground">POST</span> /consent/handle/resolve</li>
                  <li><span className="text-muted-foreground">GET</span>  /artefact/{'{consentId}'}/signed</li>
                </ul>
              </div>
              <div className="rounded border bg-background p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  DPCMS alignment (DEPA v1.1)
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  <li>Consent artefact: <code>ver: &quot;1.0&quot;</code>, RS256-signed JWS</li>
                  <li>
                    Principal identifier: <code>id_hash</code> (SHA-256 of UCIC + org salt) — no raw UCIC over the wire
                  </li>
                  <li>Data fiduciary: KSCB org slug + signing kid</li>
                  <li>Purpose + lawful basis embedded per DPDP §6/§7</li>
                  <li>Audit chain hash threaded through every state change</li>
                  <li>Notice translations in all 22 Schedule-8 languages already published</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              When GoI publishes the endpoint, an it_admin will update the
              <code className="mx-1 rounded bg-muted px-1">baseUrl</code> + credentials, switch the
              connector to <code>sandbox</code>, validate, then promote to <code>live</code> — all
              from <code>/admin/integrations/meity_consent_stack</code>, no deploy needed.
            </p>

            <form action={markMeityReadyAction}>
              <input type="hidden" name="connectorId" value={c.id} />
              <Button type="submit">Mark ready (audit-stamp the readiness)</Button>
            </form>
          </CardContent>
        </Card>
      )}

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

import { db } from '@/db/client';
import { connector as connectorTable, connectorEvent } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { appendAudit, type AuditContext } from '@/lib/audit/with-audit';
import { redactPII } from '@/lib/ai/redact';
import type {
  Connector,
  ConnectorEventResult,
  ConnectorFactory,
  ConnectorHealth,
  ConnectorRegistry,
  ConnectorRow,
  ConsentValidationResult,
} from './types';
import { FinacleConnector } from './connectors/finacle';
import { NpciConnector } from './connectors/npci';
import { AadhaarConnector } from './connectors/aadhaar';
import { DigiLockerConnector } from './connectors/digilocker';
import { AccountAggregatorConnector } from './connectors/aa';
import { MeityConsentStackConnector } from './connectors/meity_consent_stack';

/**
 * Static factory map — code → constructor. Reused by the seed (to discover
 * supported events for each connector) and by `getConnector` below.
 */
export const CONNECTOR_FACTORIES: ConnectorRegistry = {
  finacle: (row: ConnectorRow) => new FinacleConnector(row),
  npci: (row: ConnectorRow) => new NpciConnector(row),
  aadhaar: (row: ConnectorRow) => new AadhaarConnector(row),
  digilocker: (row: ConnectorRow) => new DigiLockerConnector(row),
  aa: (row: ConnectorRow) => new AccountAggregatorConnector(row),
  meity_consent_stack: (row: ConnectorRow) => new MeityConsentStackConnector(row),
};

export const ALL_CONNECTOR_CODES = Object.keys(CONNECTOR_FACTORIES) as readonly string[];

export function factoryFor(code: string): ConnectorFactory | null {
  return CONNECTOR_FACTORIES[code] ?? null;
}

export async function loadConnectorRow(orgId: string, code: string): Promise<ConnectorRow | null> {
  const rows = await db
    .select()
    .from(connectorTable)
    .where(and(eq(connectorTable.orgId, orgId), eq(connectorTable.code, code)))
    .limit(1);
  return (rows[0] as ConnectorRow | undefined) ?? null;
}

export async function loadConnectorRowById(
  orgId: string,
  id: string,
): Promise<ConnectorRow | null> {
  const rows = await db
    .select()
    .from(connectorTable)
    .where(and(eq(connectorTable.orgId, orgId), eq(connectorTable.id, id)))
    .limit(1);
  return (rows[0] as ConnectorRow | undefined) ?? null;
}

/**
 * Build a wrapped connector — every call writes a `connector_event` row and
 * appends an audit entry on the 'connector' stream. PII in payloads is
 * scrubbed via redactPII before persistence.
 */
export async function getConnector(
  orgId: string,
  code: string,
  audit: AuditContext,
): Promise<{ row: ConnectorRow; instance: Connector } | null> {
  const row = await loadConnectorRow(orgId, code);
  if (!row) return null;
  const factory = factoryFor(code);
  if (!factory) return null;
  const base = factory(row);
  return { row, instance: wrap(row, base, audit) };
}

export function buildConnector(row: ConnectorRow, audit: AuditContext): Connector | null {
  const factory = factoryFor(row.code);
  if (!factory) return null;
  return wrap(row, factory(row), audit);
}

function wrap(row: ConnectorRow, base: Connector, audit: AuditContext): Connector {
  return {
    code: base.code,
    kind: base.kind,
    mode: base.mode,
    supportedEvents: base.supportedEvents,

    async health(): Promise<ConnectorHealth> {
      const start = Date.now();
      let result: ConnectorHealth;
      let errMsg: string | null = null;
      try {
        result = await base.health();
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e);
        result = { ok: false, state: 'red', details: errMsg };
      }
      const latencyMs = Date.now() - start;
      await recordEvent(row, {
        direction: 'outbound',
        eventKind: 'health.check',
        statusCode: result.ok ? 200 : 503,
        latencyMs,
        errorMessage: errMsg,
        payload: { ok: result.ok, details: result.details, state: result.state ?? null },
      });
      await appendAudit(audit, {
        stream: 'connector',
        action: 'connector.health_check',
        target: row.id,
        payload: { code: row.code, ok: result.ok, state: result.state ?? null, latencyMs },
      });
      return result;
    },

    async triggerSampleEvent(eventKind: string, payload: object): Promise<ConnectorEventResult> {
      const start = Date.now();
      let result: ConnectorEventResult;
      let errMsg: string | null = null;
      try {
        result = await base.triggerSampleEvent(eventKind, payload);
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e);
        result = {
          statusCode: 500,
          latencyMs: Date.now() - start,
          response: { error: 'connector_threw', message: errMsg },
        };
      }
      await recordEvent(row, {
        direction: 'outbound',
        eventKind,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        errorMessage: errMsg,
        payload: { input: payload, response: result.response },
      });
      await appendAudit(audit, {
        stream: 'connector',
        action: 'connector.event_triggered',
        target: row.id,
        payload: {
          code: row.code,
          eventKind,
          statusCode: result.statusCode,
          latencyMs: result.latencyMs,
        },
      });
      return result;
    },

    validateConsent: base.validateConsent
      ? async (
          principal: { userId: string | null; label: string },
          purposeCode: string,
        ): Promise<ConsentValidationResult> => {
          const r = await base.validateConsent!(principal, purposeCode);
          await appendAudit(audit, {
            stream: 'connector',
            action: 'connector.consent_check',
            target: row.id,
            payload: {
              code: row.code,
              purposeCode,
              principal: principal.userId,
              decision: r.allow ? 'allow' : 'deny',
            },
          });
          return r;
        }
      : undefined,

    discoverDataAssets: base.discoverDataAssets
      ? () => base.discoverDataAssets!()
      : undefined,
  };
}

async function recordEvent(
  row: ConnectorRow,
  args: {
    direction: 'inbound' | 'outbound';
    eventKind: string;
    statusCode: number;
    latencyMs: number;
    errorMessage: string | null;
    payload: object;
  },
) {
  await db.insert(connectorEvent).values({
    orgId: row.orgId,
    connectorId: row.id,
    direction: args.direction,
    eventKind: args.eventKind,
    payloadRedacted: redactPayload(args.payload),
    statusCode: args.statusCode,
    latencyMs: args.latencyMs,
    errorMessage: args.errorMessage,
    correlationId: null,
  });
}

/** Walk a JSON-ish value and run every string through redactPII. */
export function redactPayload(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return redactPII(value);
  if (Array.isArray(value)) return value.map(redactPayload);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactPayload(v);
    }
    return out;
  }
  return value;
}

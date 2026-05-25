'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  connector as connectorTable,
  connectorEvent,
  consentEnforcementCheck,
} from '@/db/schema';
import { getActor, hasAnyRole } from './_actor';
import { appendAudit } from '@/lib/audit/with-audit';
import {
  buildConnector,
  factoryFor,
  loadConnectorRow,
  loadConnectorRowById,
} from '@/modules/integrations/registry';

type Actor = Awaited<ReturnType<typeof getActor>>;

function requireOperator(actor: Actor) {
  if (!hasAnyRole(actor.roles, ['it_admin', 'dpo'])) {
    throw new Error('forbidden — only it_admin or dpo can mutate connectors');
  }
}

export async function toggleConnectorEnabledAction(formData: FormData) {
  const connectorId = String(formData.get('connectorId') ?? '').trim();
  if (!connectorId) throw new Error('connectorId_required');

  const actor = await getActor();
  requireOperator(actor);

  const row = await loadConnectorRowById(actor.orgId, connectorId);
  if (!row) throw new Error('connector_not_found');

  const next = !row.enabled;
  await db
    .update(connectorTable)
    .set({ enabled: next, updatedAt: new Date() })
    .where(eq(connectorTable.id, connectorId));

  await appendAudit(
    {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
    {
      stream: 'connector',
      action: 'connector.enabled_toggled',
      target: connectorId,
      payload: { code: row.code, from: row.enabled, to: next },
    },
  );

  revalidatePath('/admin/integrations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/integrations/${row.code}` as any);
}

export async function setConnectorModeAction(formData: FormData) {
  const connectorId = String(formData.get('connectorId') ?? '').trim();
  const modeRaw = String(formData.get('mode') ?? '').trim();
  if (!connectorId) throw new Error('connectorId_required');
  if (!['mock', 'sandbox', 'live'].includes(modeRaw)) throw new Error('invalid_mode');
  const mode = modeRaw as 'mock' | 'sandbox' | 'live';

  const actor = await getActor();
  requireOperator(actor);

  const row = await loadConnectorRowById(actor.orgId, connectorId);
  if (!row) throw new Error('connector_not_found');

  if (mode !== 'mock') {
    // POC: sandbox/live require a real config blob. Log the attempt + error
    // out gracefully — the button is visible to evidence the surface exists.
    await appendAudit(
      {
        orgId: actor.orgId,
        actorUserId: actor.actorUserId,
        actorLabel: actor.actorLabel,
      },
      {
        stream: 'connector',
        action: 'connector.mode_change_rejected',
        target: connectorId,
        payload: { code: row.code, attemptedMode: mode },
      },
    );
    throw new Error('sandbox/live require configuration — supply baseUrl + apiKeyRef first.');
  }

  await db
    .update(connectorTable)
    .set({ mode, updatedAt: new Date() })
    .where(eq(connectorTable.id, connectorId));

  await appendAudit(
    {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
    {
      stream: 'connector',
      action: 'connector.mode_set',
      target: connectorId,
      payload: { code: row.code, from: row.mode, to: mode },
    },
  );

  revalidatePath('/admin/integrations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/integrations/${row.code}` as any);
}

export async function runHealthCheckAction(formData: FormData) {
  const connectorId = String(formData.get('connectorId') ?? '').trim();
  if (!connectorId) throw new Error('connectorId_required');

  const actor = await getActor();
  requireOperator(actor);

  const row = await loadConnectorRowById(actor.orgId, connectorId);
  if (!row) throw new Error('connector_not_found');

  const instance = buildConnector(row, {
    orgId: actor.orgId,
    actorUserId: actor.actorUserId,
    actorLabel: actor.actorLabel,
  });
  if (!instance) throw new Error('no_connector_factory');

  const result = await instance.health();
  const state = result.state ?? (result.ok ? 'green' : 'red');

  await db
    .update(connectorTable)
    .set({ healthState: state, lastHealthCheckAt: new Date(), updatedAt: new Date() })
    .where(eq(connectorTable.id, connectorId));

  revalidatePath('/admin/integrations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/integrations/${row.code}` as any);
}

export async function triggerEventAction(formData: FormData) {
  const connectorCode = String(formData.get('connectorCode') ?? '').trim();
  const eventKind = String(formData.get('eventKind') ?? '').trim();
  const payloadRaw = String(formData.get('payload') ?? '').trim();

  if (!connectorCode || !eventKind) throw new Error('connectorCode_and_eventKind_required');

  let payload: object = {};
  if (payloadRaw) {
    try {
      const parsed = JSON.parse(payloadRaw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed as object;
      } else {
        throw new Error('payload_must_be_object');
      }
    } catch {
      throw new Error('payload_must_be_valid_json_object');
    }
  }

  const actor = await getActor();
  requireOperator(actor);

  const row = await loadConnectorRow(actor.orgId, connectorCode);
  if (!row) throw new Error('connector_not_found');

  const instance = buildConnector(row, {
    orgId: actor.orgId,
    actorUserId: actor.actorUserId,
    actorLabel: actor.actorLabel,
  });
  if (!instance) throw new Error('no_connector_factory');

  await instance.triggerSampleEvent(eventKind, payload);

  revalidatePath('/admin/integrations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/integrations/${row.code}` as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect(`/admin/integrations/${row.code}` as any);
}

export async function replayEventAction(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '').trim();
  if (!eventId) throw new Error('eventId_required');

  const actor = await getActor();
  requireOperator(actor);

  const rows = await db
    .select()
    .from(connectorEvent)
    .where(eq(connectorEvent.id, eventId))
    .limit(1);
  const ev = rows[0];
  if (!ev) throw new Error('event_not_found');
  if (ev.orgId !== actor.orgId) throw new Error('org_mismatch');

  const connectorRow = await loadConnectorRowById(actor.orgId, ev.connectorId);
  if (!connectorRow) throw new Error('connector_not_found');

  const instance = buildConnector(connectorRow, {
    orgId: actor.orgId,
    actorUserId: actor.actorUserId,
    actorLabel: actor.actorLabel,
  });
  if (!instance) throw new Error('no_connector_factory');

  // Original payload was stored as { input, response }. Replay using input only.
  const stored = ev.payloadRedacted as { input?: unknown } | null;
  const input =
    stored && typeof stored === 'object' && 'input' in stored && stored.input && typeof stored.input === 'object'
      ? (stored.input as object)
      : {};

  await instance.triggerSampleEvent(ev.eventKind, input);

  revalidatePath('/admin/integrations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/integrations/${connectorRow.code}` as any);
}

export async function validateConsentAction(formData: FormData) {
  const connectorId = String(formData.get('connectorId') ?? '').trim();
  const purposeCode = String(formData.get('purposeCode') ?? '').trim();
  const principalUserIdRaw = String(formData.get('principalUserId') ?? '').trim();
  if (!connectorId || !purposeCode) throw new Error('connectorId_and_purposeCode_required');

  const actor = await getActor();
  requireOperator(actor);

  const row = await loadConnectorRowById(actor.orgId, connectorId);
  if (!row) throw new Error('connector_not_found');

  const factory = factoryFor(row.code);
  if (!factory) throw new Error('no_connector_factory');
  const base = factory(row);
  if (!base.validateConsent) throw new Error('connector_does_not_implement_validateConsent');

  const principalUserId = principalUserIdRaw || null;
  const result = await base.validateConsent(
    { userId: principalUserId, label: principalUserId ?? 'anonymous' },
    purposeCode,
  );

  await db.insert(consentEnforcementCheck).values({
    orgId: actor.orgId,
    connectorId,
    principalUserId,
    purposeCode,
    decision: result.allow ? 'allow' : 'deny',
    reason: result.reason,
  });

  await appendAudit(
    {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
    {
      stream: 'connector',
      action: 'connector.consent_check_recorded',
      target: connectorId,
      payload: {
        code: row.code,
        purposeCode,
        principalUserId,
        decision: result.allow ? 'allow' : 'deny',
      },
    },
  );

  revalidatePath('/admin/integrations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/admin/integrations/${row.code}` as any);
}

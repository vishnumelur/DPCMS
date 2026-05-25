'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActor, hasAnyRole, primaryAdminRole } from './_actor';
import { createDsr, transitionDsr, DSR_KINDS, type DsrKind } from '@/modules/rights/service';
import type { DsrEventName } from '@/modules/rights/flow';
import { can } from '@/lib/auth/rbac';

function asDsrKind(raw: string): DsrKind {
  if ((DSR_KINDS as readonly string[]).includes(raw)) return raw as DsrKind;
  throw new Error('invalid_kind');
}

export async function createDsrAction(formData: FormData) {
  const kind = asDsrKind(String(formData.get('kind') ?? '').trim());
  const subject = String(formData.get('subject') ?? '').trim();
  const details = String(formData.get('details') ?? '').trim();
  if (!subject || !details) throw new Error('subject_and_details_required');

  const actor = await getActor();
  // Any authenticated principal may raise their own DSR.
  if (!can({ kind: primaryAdminRole(actor.roles) }, 'dsr', 'create') &&
      !can({ kind: 'customer' }, 'dsr', 'create')) {
    // Customers always have dsr:create; this branch is defensive only.
    throw new Error('forbidden');
  }

  await createDsr({
    orgId: actor.orgId,
    principalUserId: actor.actorUserId,
    kind,
    subject,
    details,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/me/requests');
  revalidatePath('/admin/dsr');
  redirect('/me/requests');
}

const ALLOWED_EVENTS: ReadonlySet<DsrEventName> = new Set<DsrEventName>([
  'VERIFY_IDENTITY',
  'START_REVIEW',
  'REQUEST_INFO',
  'INFO_RECEIVED',
  'FULFILL',
  'REJECT',
  'ESCALATE',
]);

export async function transitionDsrAction(formData: FormData) {
  const requestId = String(formData.get('requestId') ?? '').trim();
  const rawEvent = String(formData.get('event') ?? '').trim() as DsrEventName;
  const note = String(formData.get('note') ?? '').trim();
  if (!requestId) throw new Error('requestId_required');
  if (!ALLOWED_EVENTS.has(rawEvent)) throw new Error('invalid_event');

  const actor = await getActor();
  const role = primaryAdminRole(actor.roles);
  if (!can({ kind: role }, 'dsr', 'approve') && !hasAnyRole(actor.roles, ['dpo', 'privacy_steward'])) {
    throw new Error('forbidden');
  }

  await transitionDsr({
    requestId,
    event: rawEvent,
    actorRole: role,
    note: note || undefined,
    audit: {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
  });

  revalidatePath('/admin/dsr');
  revalidatePath(`/admin/dsr/${requestId}`);
  revalidatePath('/me/requests');
}

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { breachAction, breachCohort } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { getActor, hasAnyRole } from '@/lib/actions/_actor';
import { appendAudit } from '@/lib/audit/with-audit';
import { getIncident } from '@/modules/breach/service';
import { renderDpbReportPdf } from '@/modules/breach/pdf-report';

// PDF generation depends on Node-only APIs from @react-pdf/renderer
// (font loading, streams). Force the Node.js runtime.
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await params;
  const actor = await getActor();
  if (!hasAnyRole(actor.roles, ['dpo', 'privacy_steward'])) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const incident = await getIncident(actor.orgId, incidentId);
  if (!incident) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [actions, cohort] = await Promise.all([
    db.select().from(breachAction).where(eq(breachAction.incidentId, incidentId)).orderBy(asc(breachAction.createdAt)),
    db.select({ id: breachCohort.id }).from(breachCohort).where(eq(breachCohort.incidentId, incidentId)),
  ]);

  const pdfBuffer = await renderDpbReportPdf(incident, actions, cohort.length);

  await appendAudit(
    {
      orgId: actor.orgId,
      actorUserId: actor.actorUserId,
      actorLabel: actor.actorLabel,
    },
    {
      stream: 'breach',
      action: 'breach.dpb_pdf_downloaded',
      target: incident.id,
      payload: { bytes: pdfBuffer.length, severity: incident.severity },
    },
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="dpb-notification-${incident.id}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}

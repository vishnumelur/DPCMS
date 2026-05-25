import { db } from '@/db/client';
import { user, connector as connectorTable, connectorEvent } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { appendAudit } from '@/lib/audit/with-audit';
import { CONNECTOR_FACTORIES, redactPayload } from '@/modules/integrations/registry';
import type { ConnectorKind } from '@/modules/integrations/types';

const ADMIN_USERNAME = 'dpcmsadmin';

type ConnectorSeed = {
  code: string;
  name: string;
  kind: ConnectorKind;
  mode: 'mock' | 'sandbox';
  enabled: boolean;
  healthState: 'green' | 'amber' | 'red';
  configJson: Record<string, unknown>;
};

const CONNECTORS: readonly ConnectorSeed[] = [
  {
    code: 'finacle',
    name: 'Infosys Finacle 10.2.25 (CBS)',
    kind: 'cbs',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    configJson: {
      baseUrl: 'https://finacle.kscb.example.in/services/v10',
      apiKeyRef: 'env:FINACLE_API_KEY',
      branchSpace: 'KSCB',
      version: '10.2.25',
      mockSeed: 'p4-finacle',
    },
  },
  {
    code: 'npci',
    name: 'NPCI gateway (UPI / AEPS / BBPS)',
    kind: 'payments',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    configJson: {
      baseUrl: 'https://api.npci.org.in/upi/v2',
      apiKeyRef: 'env:NPCI_API_KEY',
      psoId: 'KSCB-PSO',
      mockSeed: 'p4-npci',
    },
  },
  {
    code: 'aadhaar',
    name: 'UIDAI Aadhaar e-KYC (OTP)',
    kind: 'identity',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    configJson: {
      baseUrl: 'https://kyc.uidai.gov.in/uidkyc',
      auaCode: 'KSCB-AUA-MOCK',
      licenseKeyRef: 'env:UIDAI_LICENCE_KEY',
      mockSeed: 'p4-aadhaar',
    },
  },
  {
    code: 'digilocker',
    name: 'DigiLocker (issued documents)',
    kind: 'document',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    configJson: {
      baseUrl: 'https://api.digitallocker.gov.in/public/v1',
      clientIdRef: 'env:DIGILOCKER_CLIENT_ID',
      clientSecretRef: 'env:DIGILOCKER_CLIENT_SECRET',
      mockSeed: 'p4-digilocker',
    },
  },
  {
    code: 'aa',
    name: 'Account Aggregator (Sahamati ReBIT 1.1.2)',
    kind: 'consent_aggregator',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    configJson: {
      baseUrl: 'https://aa.sahamati.org.in/v1.1.2',
      fiuId: 'KSCB-FIU-001',
      tspPartner: 'Setu',
      mockSeed: 'p4-aa',
    },
  },
  {
    code: 'meity_consent_stack',
    name: 'MeitY National Consent Stack (placeholder)',
    kind: 'consent_aggregator',
    mode: 'sandbox',
    enabled: true,
    healthState: 'amber',
    configJson: {
      baseUrl: 'pending-goi-release',
      note: 'Awaiting GoI release of national consent stack endpoint.',
    },
  },
];

// Sample event seeds — { connectorCode, eventKind, payload, statusCode, latencyMs }
type EventSeed = {
  code: string;
  eventKind: string;
  payload: unknown;
  statusCode: number;
  latencyMs: number;
};

const SAMPLE_EVENTS: readonly EventSeed[] = [
  {
    code: 'finacle',
    eventKind: 'customer.profile.fetched',
    statusCode: 200,
    latencyMs: 42,
    payload: {
      input: { cif: 'CIF1000234' },
      response: {
        FIBaseResponse: {
          ResponseHeader: { Status: 'SUCCESS', SrvcRequestId: 'CUST-seed-1' },
          CustMaster: {
            cif: 'CIF1000234',
            branchCode: '0042',
            kycStatus: 'COMPLIANT',
            crncyCode: 'INR',
          },
        },
      },
    },
  },
  {
    code: 'finacle',
    eventKind: 'account.opened',
    statusCode: 201,
    latencyMs: 84,
    payload: {
      input: { cif: 'CIF1000234', prodCode: 'SBSAV' },
      response: {
        FIBaseResponse: {
          ResponseHeader: { Status: 'SUCCESS', SrvcRequestId: 'ACCT-seed-1' },
          AcctDetails: {
            cif: 'CIF1000234',
            acctNumber: '00420100123456',
            prodCode: 'SBSAV',
            crncyCode: 'INR',
            acctStatus: 'OPEN',
          },
        },
      },
    },
  },
  {
    code: 'npci',
    eventKind: 'upi.consent_required',
    statusCode: 202,
    latencyMs: 22,
    payload: {
      input: { txnId: 'NPCIUPI-seed-1' },
      response: {
        head: { ver: '2.0' },
        txn: { id: 'NPCIUPI-seed-1', type: 'COLLECT' },
        amount: '500.00',
        mcc: '6011',
      },
    },
  },
  {
    code: 'npci',
    eventKind: 'bbps.bill_paid',
    statusCode: 200,
    latencyMs: 96,
    payload: {
      input: { txnId: 'BBPS-seed-1' },
      response: {
        billerId: 'KSEB00000KER02',
        billAmount: '1450.00',
        ResCode: '000',
        rrn: '123456789012',
      },
    },
  },
  {
    code: 'aadhaar',
    eventKind: 'otp.requested',
    statusCode: 200,
    latencyMs: 280,
    payload: {
      input: { txn: 'KSCB:seed-1' },
      response: { otpRes: { ret: 'y', maskedUid: 'XXXXXXXX1234', info: 'OTP sent' } },
    },
  },
  {
    code: 'aadhaar',
    eventKind: 'otp.verified',
    statusCode: 200,
    latencyMs: 420,
    payload: {
      input: { txn: 'KSCB:seed-1' },
      response: {
        kycXml: '<KycRes><UidData uid="XXXXXXXX1234"/></KycRes>',
        verified: true,
        maskedUid: 'XXXXXXXX1234',
      },
    },
  },
  {
    code: 'digilocker',
    eventKind: 'document.fetched',
    statusCode: 200,
    latencyMs: 310,
    payload: {
      input: { docTypeURI: 'in.gov.uidai-Aadhaar' },
      response: {
        items: [
          {
            docTypeURI: 'in.gov.uidai-Aadhaar',
            issuerInstitute: 'UIDAI',
            dateOfIssue: '2018-04-10',
            name: 'Aadhaar Card',
          },
        ],
      },
    },
  },
  {
    code: 'aa',
    eventKind: 'consent.request_sent',
    statusCode: 200,
    latencyMs: 120,
    payload: {
      input: { consentHandle: 'CH-seed-1' },
      response: {
        ConsentHandle: 'CH-seed-1',
        ConsentStatus: 'PENDING',
        ConsentDetail: { fiTypes: ['DEPOSIT'] },
      },
    },
  },
  {
    code: 'aa',
    eventKind: 'consent.granted_by_user',
    statusCode: 200,
    latencyMs: 1400,
    payload: {
      input: { consentHandle: 'CH-seed-1' },
      response: {
        ConsentHandle: 'CH-seed-1',
        ConsentStatus: 'ACTIVE',
        ConsentArtefactSignedXML: '<ConsentArtefact>...JWS placeholder...</ConsentArtefact>',
      },
    },
  },
  {
    code: 'meity_consent_stack',
    eventKind: 'health.check',
    statusCode: 503,
    latencyMs: 5,
    payload: {
      ok: false,
      details: 'Awaiting GoI release — endpoint pending.',
      state: 'amber',
    },
  },
];

/**
 * Seed six connectors + ~10 sample events so the dashboard is populated. Safe
 * to re-run: keyed on (orgId, code) for connectors and on (connectorId,
 * eventKind, statusCode) for events.
 */
export async function seedConnectorsP4(orgId: string) {
  const adminRows = await db.select().from(user).where(eq(user.email, ADMIN_USERNAME)).limit(1);
  const admin = adminRows[0];
  if (!admin) {
    console.log(`Admin user ${ADMIN_USERNAME} missing — skipping connectors seed.`);
    return;
  }

  // ─── Connectors ─────────────────────────────────────────────────────────
  for (const seed of CONNECTORS) {
    const existing = await db
      .select()
      .from(connectorTable)
      .where(and(eq(connectorTable.orgId, orgId), eq(connectorTable.code, seed.code)))
      .limit(1);
    if (existing[0]) {
      console.log(`Connector "${seed.code}" already exists — skipping.`);
      continue;
    }
    if (!CONNECTOR_FACTORIES[seed.code]) {
      console.warn(`No factory for connector code "${seed.code}" — skipping seed insert.`);
      continue;
    }
    await db.insert(connectorTable).values({
      orgId,
      code: seed.code,
      name: seed.name,
      kind: seed.kind,
      mode: seed.mode,
      enabled: seed.enabled,
      healthState: seed.healthState,
      configJson: seed.configJson,
    });
    await appendAudit(
      { orgId, actorUserId: admin.id, actorLabel: ADMIN_USERNAME },
      {
        stream: 'connector',
        action: 'connector.seeded',
        target: seed.code,
        payload: { code: seed.code, mode: seed.mode, kind: seed.kind, seeded: true },
      },
    );
    console.log(`Seeded connector "${seed.code}" (${seed.kind} / ${seed.mode}).`);
  }

  // ─── Sample events ───────────────────────────────────────────────────────
  const allConnectors = await db
    .select()
    .from(connectorTable)
    .where(eq(connectorTable.orgId, orgId));
  const byCode = new Map(allConnectors.map((c) => [c.code, c]));

  for (const ev of SAMPLE_EVENTS) {
    const c = byCode.get(ev.code);
    if (!c) continue;
    const existing = await db
      .select()
      .from(connectorEvent)
      .where(and(eq(connectorEvent.connectorId, c.id), eq(connectorEvent.eventKind, ev.eventKind)))
      .limit(1);
    if (existing[0]) continue;
    await db.insert(connectorEvent).values({
      orgId,
      connectorId: c.id,
      direction: 'outbound',
      eventKind: ev.eventKind,
      payloadRedacted: redactPayload(ev.payload) as object,
      statusCode: ev.statusCode,
      latencyMs: ev.latencyMs,
      errorMessage: null,
      correlationId: null,
    });
  }

  console.log(`Seeded ${SAMPLE_EVENTS.length} sample connector events (idempotent skip on re-run).`);
}

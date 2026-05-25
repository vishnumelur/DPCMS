import type {
  Connector,
  ConnectorEventResult,
  ConnectorHealth,
  ConnectorRow,
  ConsentValidationResult,
} from '../types';

/**
 * Account Aggregator (Sahamati ReBIT FI 1.1.2) simulator. Payloads use the
 * field names you actually see on the spec — consentHandle, ConsentDetail,
 * fiTypes, and the placeholder `ConsentArtefactSignedXML`.
 */
export class AccountAggregatorConnector implements Connector {
  readonly code = 'aa';
  readonly kind = 'consent_aggregator' as const;
  readonly mode: 'mock' | 'sandbox' | 'live';
  readonly supportedEvents = [
    'consent.request_sent',
    'consent.granted_by_user',
    'fi.fetch_completed',
  ] as const;

  constructor(row: ConnectorRow) {
    this.mode = (row.mode as 'mock' | 'sandbox' | 'live') ?? 'mock';
  }

  async health(): Promise<ConnectorHealth> {
    if (this.mode === 'live') {
      return {
        ok: false,
        state: 'red',
        details:
          'AA live integration requires Sahamati membership + a TSP partnership (Setu / Finvu).',
      };
    }
    return {
      ok: true,
      state: 'green',
      details: 'AA Sahamati sandbox simulator reachable.',
    };
  }

  async triggerSampleEvent(eventKind: string, payload: object): Promise<ConnectorEventResult> {
    const start = Date.now();
    if (this.mode === 'live') {
      return {
        statusCode: 501,
        latencyMs: Date.now() - start,
        response: { error: 'live_not_configured' },
      };
    }

    const consentHandle =
      (payload as { consentHandle?: string }).consentHandle ?? `CH-${Date.now()}`;
    const ts = new Date().toISOString();
    const fiTypes = ['DEPOSIT', 'TERM_DEPOSIT', 'RECURRING_DEPOSIT'];

    switch (eventKind) {
      case 'consent.request_sent':
        return {
          statusCode: 200,
          latencyMs: 95 + Math.floor(Math.random() * 60),
          response: {
            ver: '1.1.2',
            timestamp: ts,
            txnid: txnId(),
            ConsentHandle: consentHandle,
            ConsentStatus: 'PENDING',
            ConsentDetail: {
              consentStart: ts,
              consentExpiry: oneYearLater(ts),
              consentMode: 'STORE',
              fetchType: 'PERIODIC',
              consentTypes: ['PROFILE', 'SUMMARY', 'TRANSACTIONS'],
              fiTypes,
              DataConsumer: { id: 'KSCB-FIU-001', type: 'FIU' },
              Customer: { id: 'r******i@onemoney' },
              Purpose: { code: '101', text: 'Wealth-management for retail customer' },
            },
          },
        };

      case 'consent.granted_by_user':
        return {
          statusCode: 200,
          latencyMs: 1200 + Math.floor(Math.random() * 800),
          response: {
            ver: '1.1.2',
            timestamp: ts,
            txnid: txnId(),
            ConsentHandle: consentHandle,
            ConsentStatus: 'ACTIVE',
            ConsentArtefactSignedXML:
              '<ConsentArtefact>...JWS-signed XML placeholder per ReBIT 1.1.2...</ConsentArtefact>',
            fiTypes,
            signedAt: ts,
          },
        };

      case 'fi.fetch_completed':
        return {
          statusCode: 200,
          latencyMs: 2200 + Math.floor(Math.random() * 1500),
          response: {
            ver: '1.1.2',
            timestamp: ts,
            txnid: txnId(),
            sessionId: `SID-${Date.now()}`,
            ConsentHandle: consentHandle,
            FIDataRange: {
              from: oneMonthAgo(ts),
              to: ts,
            },
            FI: fiTypes.map((t) => ({
              fipID: 'FIP-HDFC',
              accountRefNumber: 'X' + Math.floor(1e9 + Math.random() * 9e9),
              maskedAccountNumber: 'XXXXXXXX' + Math.floor(1000 + Math.random() * 9000),
              type: t,
              dataFetched: true,
            })),
          },
        };

      default:
        return {
          statusCode: 404,
          latencyMs: Date.now() - start,
          response: {
            error: 'unsupported_event',
            eventKind,
            supported: this.supportedEvents,
          },
        };
    }
  }

  async validateConsent(
    principal: { userId: string | null; label: string },
    purposeCode: string,
  ): Promise<ConsentValidationResult> {
    // POC: any AA-eligible purpose is allowed; otherwise deny with reason.
    const ok = ['KYC', 'ACCOUNT_OPENING', 'TRANSACTIONS', 'WEALTH_MGMT'].includes(purposeCode);
    return {
      allow: ok,
      reason: ok
        ? `Purpose ${purposeCode} is in the AA allow-list for ${principal.label}.`
        : `Purpose ${purposeCode} is not whitelisted for AA fetch.`,
    };
  }
}

function txnId(): string {
  const r = () => Math.random().toString(16).slice(2, 6);
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
}
function oneYearLater(ts: string): string {
  const d = new Date(ts);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}
function oneMonthAgo(ts: string): string {
  const d = new Date(ts);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

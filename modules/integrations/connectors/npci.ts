import type {
  Connector,
  ConnectorEventResult,
  ConnectorHealth,
  ConnectorRow,
} from '../types';

/**
 * NPCI UPI / AEPS / BBPS event simulator. Payload shapes mirror the field
 * names called out in NPCI circulars (txnId, vpa, payerName, amount, mcc).
 */
export class NpciConnector implements Connector {
  readonly code = 'npci';
  readonly kind = 'payments' as const;
  readonly mode: 'mock' | 'sandbox' | 'live';
  readonly supportedEvents = [
    'upi.consent_required',
    'aeps.txn_completed',
    'bbps.bill_paid',
  ] as const;

  constructor(row: ConnectorRow) {
    this.mode = (row.mode as 'mock' | 'sandbox' | 'live') ?? 'mock';
  }

  async health(): Promise<ConnectorHealth> {
    if (this.mode === 'live') {
      return {
        ok: false,
        state: 'red',
        details: 'NPCI live access requires PSO onboarding and an NPCI bilateral key.',
      };
    }
    return {
      ok: true,
      state: 'green',
      details: 'NPCI sandbox simulator (UPI / AEPS / BBPS) reachable.',
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

    const txnId = (payload as { txnId?: string }).txnId ?? `NPCI${Date.now()}`;

    switch (eventKind) {
      case 'upi.consent_required':
        return {
          statusCode: 202,
          latencyMs: 14 + Math.floor(Math.random() * 30),
          response: {
            head: { ver: '2.0', ts: new Date().toISOString(), orgId: 'NPCI', msgId: txnId },
            txn: {
              id: txnId,
              type: 'COLLECT',
              note: 'Recurring SIP mandate authorisation',
              ts: new Date().toISOString(),
            },
            payer: { vpa: 'r******i@okhdfcbank', payerName: 'R***** P*****' },
            payee: { vpa: 'kscb.merchant@kscbupi', merchantName: 'Kerala State Co-op Bank' },
            amount: '500.00',
            curr: 'INR',
            mcc: '6011',
            consent: { required: true, expiresIn: 'PT5M' },
          },
        };

      case 'aeps.txn_completed':
        return {
          statusCode: 200,
          latencyMs: 110 + Math.floor(Math.random() * 90),
          response: {
            head: { ver: '1.0', ts: new Date().toISOString(), msgId: txnId },
            ResCode: '00',
            ResDesc: 'TRANSACTION SUCCESSFUL',
            txnType: 'CW',
            uidNum: 'XXXXXXXX1234',
            iin: '607094',
            bcCode: 'BC-KL-0042',
            amount: '2000.00',
            txnId,
            rrn: rrn(),
            stan: stan(),
            terminalId: 'KSCB-MICRO-ATM-042',
          },
        };

      case 'bbps.bill_paid':
        return {
          statusCode: 200,
          latencyMs: 85 + Math.floor(Math.random() * 60),
          response: {
            head: { ver: '1.0', ts: new Date().toISOString(), msgId: txnId },
            ResCode: '000',
            ResDesc: 'SUCCESS',
            txnRefId: txnId,
            billerId: 'KSEB00000KER02',
            billerName: 'Kerala State Electricity Board',
            customerParams: { ConsumerNumber: '0123456789' },
            billAmount: '1450.00',
            paidAmount: '1450.00',
            paymentMode: 'UPI',
            paymentChannel: 'INTERNET_BANKING',
            mcc: '4900',
            rrn: rrn(),
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
}

function rrn(): string {
  return Math.floor(100000000000 + Math.random() * 800000000000).toString();
}
function stan(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

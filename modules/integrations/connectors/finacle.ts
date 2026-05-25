import type {
  Connector,
  ConnectorEventResult,
  ConnectorHealth,
  ConnectorRow,
} from '../types';

/**
 * Mock Infosys Finacle 10.2.25 CBS connector. Payload shapes use real-world
 * Finacle field names (cif, acctNumber, branchCode, prodCode, solId,
 * crncyCode) so an evaluator opening a `connector_event` row recognises them.
 */
export class FinacleConnector implements Connector {
  readonly code = 'finacle';
  readonly kind = 'cbs' as const;
  readonly mode: 'mock' | 'sandbox' | 'live';
  readonly supportedEvents = [
    'customer.profile.fetched',
    'account.opened',
    'kyc.updated',
  ] as const;

  constructor(row: ConnectorRow) {
    this.mode = (row.mode as 'mock' | 'sandbox' | 'live') ?? 'mock';
  }

  async health(): Promise<ConnectorHealth> {
    if (this.mode === 'live') {
      return {
        ok: false,
        state: 'red',
        details: 'Live mode requires Finacle gateway credentials — not configured.',
      };
    }
    return {
      ok: true,
      state: 'green',
      details: `Finacle ${this.mode} mock reachable; sample CIF lookup OK.`,
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

    const ts = new Date().toISOString();
    const seedCif = (payload as { cif?: string }).cif ?? 'CIF1000234';
    const branchCode = (payload as { branchCode?: string }).branchCode ?? '0042';

    switch (eventKind) {
      case 'customer.profile.fetched':
        return {
          statusCode: 200,
          latencyMs: 28 + Math.floor(Math.random() * 50),
          response: {
            FIBaseResponse: {
              ResponseHeader: {
                Status: 'SUCCESS',
                RequestUUID: cryptoUuid(),
                SrvcRequestId: `CUST-${ts}`,
                SrvcRequestVersion: '10.2',
              },
              CustMaster: {
                cif: seedCif,
                custFirstName: 'RAMESH',
                custLastName: 'PILLAI',
                custDob: '1985-06-12',
                custType: 'INDIVIDUAL',
                kycStatus: 'COMPLIANT',
                branchCode,
                solId: `${branchCode}001`,
                crncyCode: 'INR',
                preferredAddress: {
                  addressLine1: '[REDACTED]',
                  city: 'KOCHI',
                  pinCode: '682001',
                  state: 'KL',
                },
              },
            },
          },
        };

      case 'account.opened':
        return {
          statusCode: 201,
          latencyMs: 64 + Math.floor(Math.random() * 80),
          response: {
            FIBaseResponse: {
              ResponseHeader: {
                Status: 'SUCCESS',
                RequestUUID: cryptoUuid(),
                SrvcRequestId: `ACCT-${ts}`,
              },
              AcctDetails: {
                cif: seedCif,
                acctNumber: `${branchCode}0100${randomDigits(7)}`,
                prodCode: 'SBSAV',
                schmCode: 'SBSAV01',
                branchCode,
                solId: `${branchCode}001`,
                crncyCode: 'INR',
                acctStatus: 'OPEN',
                openDate: ts.slice(0, 10),
              },
            },
          },
        };

      case 'kyc.updated':
        return {
          statusCode: 200,
          latencyMs: 41 + Math.floor(Math.random() * 60),
          response: {
            FIBaseResponse: {
              ResponseHeader: {
                Status: 'SUCCESS',
                RequestUUID: cryptoUuid(),
                SrvcRequestId: `KYC-${ts}`,
              },
              KycMaintenance: {
                cif: seedCif,
                kycStatus: 'COMPLIANT',
                lastRekycDate: ts.slice(0, 10),
                nextRekycDate: nextYear(ts).slice(0, 10),
                idType: 'AADHAAR_MASKED',
                idNumber: 'XXXX-XXXX-1234',
                branchCode,
              },
            },
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

function cryptoUuid(): string {
  // Avoid pulling crypto for runtime portability — pseudo UUID is fine for mocks.
  const r = () => Math.random().toString(16).slice(2, 6);
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
}

function randomDigits(n: number): string {
  let s = '';
  for (let i = 0; i < n; i += 1) s += Math.floor(Math.random() * 10).toString();
  return s;
}

function nextYear(ts: string): string {
  const d = new Date(ts);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

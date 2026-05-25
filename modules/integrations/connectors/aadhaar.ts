import type {
  Connector,
  ConnectorEventResult,
  ConnectorHealth,
  ConnectorRow,
} from '../types';

/**
 * UIDAI Aadhaar e-KYC OTP flow mock. Returns a UIDAI-shape XML envelope
 * (`<KycRes>` / `<UidData>` / `<Poi>`) as a string in response.kycXml.
 * Everything but the last 4 digits of the UID is masked.
 */
export class AadhaarConnector implements Connector {
  readonly code = 'aadhaar';
  readonly kind = 'identity' as const;
  readonly mode: 'mock' | 'sandbox' | 'live';
  readonly supportedEvents = ['otp.requested', 'otp.verified'] as const;

  constructor(row: ConnectorRow) {
    this.mode = (row.mode as 'mock' | 'sandbox' | 'live') ?? 'mock';
  }

  async health(): Promise<ConnectorHealth> {
    if (this.mode === 'live') {
      return {
        ok: false,
        state: 'red',
        details: 'Live e-KYC requires UIDAI AUA/KUA licence + production AUA code.',
      };
    }
    return {
      ok: true,
      state: 'green',
      details: 'UIDAI sandbox mock reachable (OTP loopback).',
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

    const txn = (payload as { txn?: string }).txn ?? `KSCB:${Date.now()}`;
    const maskedUid = 'XXXXXXXX1234';
    const ts = new Date().toISOString();

    switch (eventKind) {
      case 'otp.requested':
        return {
          statusCode: 200,
          latencyMs: 220 + Math.floor(Math.random() * 120),
          response: {
            otpRes: {
              ret: 'y',
              code: cryptoToken(),
              txn,
              ts,
              info: 'OTP sent to registered mobile (masked)',
              maskedUid,
            },
          },
        };

      case 'otp.verified': {
        const kycXml =
          `<?xml version="1.0" encoding="UTF-8"?>` +
          `<KycRes ret="y" code="${cryptoToken()}" txn="${txn}" ts="${ts}" actn="ECKYC" ttl="${ts}">` +
          `<UidData uid="${maskedUid}">` +
          `<Poi name="Ramesh Pillai" dob="1985-06-12" gender="M"/>` +
          `<Poa careof="S/O Krishna Pillai" house="House 12" street="Marine Drive" landmark="" loc="Ernakulam" vtc="Kochi" subdist="Kanayannur" dist="Ernakulam" state="Kerala" pc="682001" po="Kochi" country="India"/>` +
          `<Pht/>` +
          `</UidData>` +
          `<Signature/>` +
          `</KycRes>`;
        return {
          statusCode: 200,
          latencyMs: 310 + Math.floor(Math.random() * 200),
          response: {
            kycXml,
            verified: true,
            maskedUid,
            txn,
            ts,
          },
        };
      }

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

function cryptoToken(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

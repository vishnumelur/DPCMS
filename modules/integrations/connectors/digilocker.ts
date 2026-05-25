import type {
  Connector,
  ConnectorEventResult,
  ConnectorHealth,
  ConnectorRow,
} from '../types';

/**
 * Mock DigiLocker connector — pull / share an issued document. Payloads use
 * the field names from the DigiLocker Issued Document API (docTypeURI, name,
 * dateOfIssue, issuerInstitute).
 */
export class DigiLockerConnector implements Connector {
  readonly code = 'digilocker';
  readonly kind = 'document' as const;
  readonly mode: 'mock' | 'sandbox' | 'live';
  readonly supportedEvents = ['document.fetched', 'document.shared'] as const;

  constructor(row: ConnectorRow) {
    this.mode = (row.mode as 'mock' | 'sandbox' | 'live') ?? 'mock';
  }

  async health(): Promise<ConnectorHealth> {
    if (this.mode === 'live') {
      return {
        ok: false,
        state: 'red',
        details:
          'DigiLocker live integration requires partner-onboarding (MeitY) — POC defers.',
      };
    }
    return {
      ok: true,
      state: 'green',
      details: 'DigiLocker sandbox mock reachable.',
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

    const docTypeURI =
      (payload as { docTypeURI?: string }).docTypeURI ?? 'in.gov.uidai-Aadhaar';

    switch (eventKind) {
      case 'document.fetched':
        return {
          statusCode: 200,
          latencyMs: 240 + Math.floor(Math.random() * 150),
          response: {
            items: [
              {
                name: 'Aadhaar Card',
                type: 'file',
                size: '152318',
                date: new Date().toISOString().slice(0, 10),
                parent: 'eaadhaar',
                mime: 'application/pdf',
                uri: `${docTypeURI}-1234-XXXXXXXX1234`,
                docTypeURI,
                doctype: 'ADHAR',
                description: 'eAadhaar (masked)',
                issuerId: 'in.gov.uidai',
                issuer: 'Unique Identification Authority of India',
                issuerInstitute: 'UIDAI',
                dateOfIssue: '2018-04-10',
              },
            ],
          },
        };

      case 'document.shared':
        return {
          statusCode: 200,
          latencyMs: 180 + Math.floor(Math.random() * 100),
          response: {
            shareId: `SH${Date.now()}`,
            sharedAt: new Date().toISOString(),
            docTypeURI,
            sharedWith: 'KSCB-Onboarding',
            consentText:
              'You are sharing eAadhaar with Kerala State Co-op Bank for the purpose of account opening (KYC).',
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

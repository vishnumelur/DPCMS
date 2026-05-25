import type {
  Connector,
  ConnectorEventResult,
  ConnectorHealth,
  ConnectorRow,
} from '../types';

/**
 * Placeholder connector for the national MeitY consent stack (BRD published
 * but no production endpoint at POC build time). Health always reports amber
 * + 'awaiting GoI release'; sample events return HTTP 503 so the UI clearly
 * shows we are RA-when-it-lands.
 */
export class MeityConsentStackConnector implements Connector {
  readonly code = 'meity_consent_stack';
  readonly kind = 'consent_aggregator' as const;
  readonly mode: 'mock' | 'sandbox' | 'live';
  readonly supportedEvents = [
    'consent.notice_published',
    'consent.principal_decision',
  ] as const;

  constructor(row: ConnectorRow) {
    this.mode = (row.mode as 'mock' | 'sandbox' | 'live') ?? 'sandbox';
  }

  async health(): Promise<ConnectorHealth> {
    return {
      ok: false,
      state: 'amber',
      details:
        'Awaiting GoI release — MeitY National Consent Stack BRD published; production endpoint pending.',
    };
  }

  async triggerSampleEvent(eventKind: string): Promise<ConnectorEventResult> {
    return {
      statusCode: 503,
      latencyMs: 5,
      response: {
        error: 'service_unavailable',
        details:
          'MeitY consent stack endpoint not yet released. Connector ships ready and will switch over without code changes.',
        attemptedEventKind: eventKind,
        supported: this.supportedEvents,
      },
    };
  }
}

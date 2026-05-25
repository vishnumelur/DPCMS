/**
 * Connector framework types — every external integration (CBS, NPCI, Aadhaar,
 * DigiLocker, Account Aggregator, MeitY consent stack) implements the
 * `Connector` interface. The registry wraps every call to push a
 * `connector_event` row + an audit chain entry.
 */

export type ConnectorKind =
  | 'cbs'
  | 'payments'
  | 'identity'
  | 'document'
  | 'consent_aggregator';

export type ConnectorMode = 'mock' | 'sandbox' | 'live';
export type ConnectorHealthState = 'green' | 'amber' | 'red';

export type ConnectorHealth = {
  ok: boolean;
  details: string;
  state?: ConnectorHealthState;
};

export type ConnectorEventResult = {
  statusCode: number;
  latencyMs: number;
  response: object;
};

export type ConsentValidationResult = {
  allow: boolean;
  reason: string;
};

export type DiscoveryResult = {
  count: number;
  categories: string[];
};

export interface Connector {
  readonly code: string;
  readonly kind: ConnectorKind;
  readonly mode: ConnectorMode;
  readonly supportedEvents: readonly string[];

  health(): Promise<ConnectorHealth>;
  triggerSampleEvent(eventKind: string, payload: object): Promise<ConnectorEventResult>;

  validateConsent?(
    principal: { userId: string | null; label: string },
    purposeCode: string,
  ): Promise<ConsentValidationResult>;

  discoverDataAssets?(): Promise<DiscoveryResult>;
}

export type ConnectorConfig = {
  baseUrl?: string;
  apiKeyRef?: string;
  mockSeed?: string;
  [k: string]: unknown;
};

export type ConnectorRow = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  kind: string;
  mode: string;
  enabled: boolean;
  healthState: string;
  lastHealthCheckAt: Date | null;
  configJson: unknown;
};

export type ConnectorFactory = (row: ConnectorRow) => Connector;

export type ConnectorRegistry = Record<string, ConnectorFactory>;

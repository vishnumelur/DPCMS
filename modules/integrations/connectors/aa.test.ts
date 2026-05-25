import { describe, it, expect } from 'vitest';
import { AccountAggregatorConnector } from './aa';
import type { ConnectorRow } from '../types';

function row(): ConnectorRow {
  return {
    id: 'test-id',
    orgId: 'test-org',
    code: 'aa',
    name: 'AA',
    kind: 'consent_aggregator',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    lastHealthCheckAt: null,
    configJson: {},
  };
}

describe('AccountAggregatorConnector', () => {
  it('emits a ConsentArtefactSignedXML when consent.granted_by_user fires', async () => {
    const c = new AccountAggregatorConnector(row());
    const r = await c.triggerSampleEvent('consent.granted_by_user', {
      consentHandle: 'CH-test-1',
    });
    expect(r.statusCode).toBe(200);
    const resp = r.response as {
      ConsentHandle?: string;
      ConsentStatus?: string;
      ConsentArtefactSignedXML?: string;
    };
    expect(resp.ConsentHandle).toBe('CH-test-1');
    expect(resp.ConsentStatus).toBe('ACTIVE');
    expect(resp.ConsentArtefactSignedXML).toMatch(/<ConsentArtefact>/);
  });

  it('allow-lists AA purposes via validateConsent', async () => {
    const c = new AccountAggregatorConnector(row());
    const r = await c.validateConsent({ userId: 'u1', label: 'u1' }, 'KYC');
    expect(r.allow).toBe(true);
    const denied = await c.validateConsent({ userId: 'u1', label: 'u1' }, 'MARKETING_EMAIL');
    expect(denied.allow).toBe(false);
  });
});

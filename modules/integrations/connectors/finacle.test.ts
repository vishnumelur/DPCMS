import { describe, it, expect } from 'vitest';
import { FinacleConnector } from './finacle';
import type { ConnectorRow } from '../types';

function row(overrides: Partial<ConnectorRow> = {}): ConnectorRow {
  return {
    id: 'test-id',
    orgId: 'test-org',
    code: 'finacle',
    name: 'Finacle',
    kind: 'cbs',
    mode: 'mock',
    enabled: true,
    healthState: 'green',
    lastHealthCheckAt: null,
    configJson: {},
    ...overrides,
  };
}

describe('FinacleConnector', () => {
  it('health returns ok + green in mock mode', async () => {
    const c = new FinacleConnector(row());
    const h = await c.health();
    expect(h.ok).toBe(true);
    expect(h.state).toBe('green');
    expect(h.details).toMatch(/finacle/i);
  });

  it('triggerSampleEvent("customer.profile.fetched") returns a Finacle-shape payload with a cif', async () => {
    const c = new FinacleConnector(row());
    const r = await c.triggerSampleEvent('customer.profile.fetched', { cif: 'CIF999' });
    expect(r.statusCode).toBe(200);
    const resp = r.response as { FIBaseResponse?: { CustMaster?: { cif?: string; branchCode?: string } } };
    expect(resp.FIBaseResponse?.CustMaster?.cif).toBe('CIF999');
    expect(typeof resp.FIBaseResponse?.CustMaster?.branchCode).toBe('string');
  });

  it('triggerSampleEvent with an unknown event kind returns 404', async () => {
    const c = new FinacleConnector(row());
    const r = await c.triggerSampleEvent('nope.unknown', {});
    expect(r.statusCode).toBe(404);
    const resp = r.response as { error?: string; supported?: readonly string[] };
    expect(resp.error).toBe('unsupported_event');
    expect(resp.supported).toContain('customer.profile.fetched');
  });
});

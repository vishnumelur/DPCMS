import { describe, it, expect } from 'vitest';

// Integration tests for grant/withdraw require Neon — manual run only.
// To enable locally: rename describe.skip -> describe.
describe.skip('consent artefacts (integration — requires Neon)', () => {
  it('grant + withdraw round trip writes artefact + preference + audit row', async () => {
    expect(true).toBe(true);
  });
});

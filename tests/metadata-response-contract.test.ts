import { describe, expect, it, vi } from 'vitest';
import { checkApiCompatibility } from '../src/api/client.js';

describe('metadata response contract', () => {
  it('rejects metadata with missing backend-required supported_clients at the parser boundary', async () => {
    const response = new Response(JSON.stringify({
      data: {
        service: 'agentfeed-api',
        api_version: 'v1',
        backend_version: '0.1.0',
        contract_version: '2026-06-03',
        review_base_url: 'http://localhost:3001',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    vi.stubGlobal('fetch', vi.fn(async () => response));

    await expect(checkApiCompatibility('http://localhost:8001/v1')).resolves.toMatchObject({
      ok: true,
      compatible: false,
      status: 200,
      url: 'http://localhost:8001/v1/metadata',
      error: 'AgentFeed API metadata response data is invalid.',
    });
  });
});

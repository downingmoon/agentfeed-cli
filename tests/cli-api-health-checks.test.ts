import { describe, expect, it, vi } from 'vitest';
import {
  apiMetadataCompatible,
  checkApiCompatibility,
  checkApiReachability,
} from '../src/api/client.js';
import { useApiHealthCheckEnvironment } from './cli-api-health-checks-helpers.js';

useApiHealthCheckEnvironment();

describe('CLI API health checks', () => {
  it('checks API compatibility metadata before release-sensitive operations', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        service: 'agentfeed-api',
        api_version: 'v1',
        backend_version: '0.1.0',
        contract_version: '2026-06-03',
        review_base_url: 'https://agentfeed.downingmoon.dev',
        supported_clients: {
          cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
          frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
        }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiCompatibility('http://localhost:8001/v1');

    expect(result).toMatchObject({ ok: true, compatible: true, status: 200, url: 'http://localhost:8001/v1/metadata' });
    expect(result.data?.contract_version).toBe('2026-06-03');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/v1/metadata', expect.objectContaining({ method: 'GET' }));
    expect(apiMetadataCompatible({
      ...result.data,
      supported_clients: {
        ...result.data?.supported_clients,
        cli: { min_version: 'not-a-version', contract_version: '2026-06-03' }
      }
    })).toBe(false);
    expect(apiMetadataCompatible({ ...result.data, review_base_url: undefined })).toBe(false);
    expect(apiMetadataCompatible({ ...result.data, review_base_url: 'http://review.internal.example' })).toBe(false);
    expect(apiMetadataCompatible({ ...result.data, review_base_url: 'https://review.internal.example/path' })).toBe(false);
  });

  it.each([
    {
      label: 'non-json metadata response',
      response: new Response('<html>not metadata</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      error: 'AgentFeed API metadata response is not JSON.'
    },
    {
      label: 'invalid-json metadata response',
      response: new Response('{not-valid-json', { status: 200, headers: { 'content-type': 'application/json' } }),
      error: 'AgentFeed API metadata response contains invalid JSON.'
    },
    {
      label: 'missing data envelope',
      response: new Response(JSON.stringify({ service: 'agentfeed-api' }), { status: 200, headers: { 'content-type': 'application/json' } }),
      error: 'AgentFeed API metadata response is missing the data envelope.'
    },
    {
      label: 'unexpected metadata envelope field',
      response: new Response(JSON.stringify({ data: { service: 'agentfeed-api' }, debug: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      error: 'AgentFeed API metadata response has unexpected data envelope fields.'
    }
  ])('reports malformed API compatibility metadata clearly: $label', async ({ response, error }) => {
    vi.stubGlobal('fetch', vi.fn(async () => response));

    await expect(checkApiCompatibility('http://localhost:8001/v1')).resolves.toMatchObject({
      ok: true,
      compatible: false,
      status: 200,
      url: 'http://localhost:8001/v1/metadata',
      error
    });
  });

  it('accepts public IPv4 HTTP review origins only under the explicit insecure API override', () => {
    const metadata = {
      service: 'agentfeed-api',
      api_version: 'v1',
      backend_version: '0.1.0',
      contract_version: '2026-06-03',
      review_base_url: 'http://161.33.171.81:13030',
      supported_clients: {
        cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
      }
    };

    delete process.env.AGENTFEED_ALLOW_INSECURE_API;
    expect(apiMetadataCompatible(metadata)).toBe(false);

    process.env.AGENTFEED_ALLOW_INSECURE_API = '1';
    expect(apiMetadataCompatible(metadata)).toBe(true);
    expect(apiMetadataCompatible({ ...metadata, review_base_url: 'http://10.0.0.5:13030' })).toBe(false);
    expect(apiMetadataCompatible({ ...metadata, review_base_url: 'http://review.internal.example:13030' })).toBe(false);
  });

  it('checks API reachability against the backend readiness endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'ready', database: { connected: true }, migration: { up_to_date: true } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiReachability('http://localhost:8001/v1');

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/health/ready' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/health/ready', expect.objectContaining({ method: 'GET' }));
  });
});

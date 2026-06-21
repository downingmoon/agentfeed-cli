import { describe, expect, it } from 'vitest';
import {
  requireApiCompatibilityBeforeCredentialSave,
  requireApiCompatibilityBeforeUpload,
  requireIngestionTokenBeforeUpload,
  requireUploadPreflight
} from '../src/cli/upload-preflight.js';
import type { ApiCheckResult, ApiCompatibilityCheckResult, ApiMetadata } from '../src/api/client.js';
import type { AgentFeedCredentials } from '../src/types.js';

function compatibleMetadata(): ApiMetadata {
  return {
    service: 'agentfeed-api',
    api_version: 'v1',
    backend_version: '0.1.0',
    contract_version: '2026-06-03',
    review_base_url: 'http://localhost:3001',
    supported_clients: {
      cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
      frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
    }
  };
}

function credentials(): AgentFeedCredentials {
  return {
    api_base_url: 'http://127.0.0.1:3001/v1',
    ingestion_token: 'af_live_test',
    created_at: '2026-06-12T00:00:00.000Z'
  };
}

describe('upload preflight recovery', () => {
  it('returns compatibility metadata before uploading when the API contract is compatible', async () => {
    const metadata = compatibleMetadata();
    const result: ApiCompatibilityCheckResult = {
      ok: true,
      compatible: true,
      url: 'http://127.0.0.1:3001/v1/metadata',
      status: 200,
      data: metadata
    };

    await expect(requireApiCompatibilityBeforeUpload('http://127.0.0.1:3001/v1', {
      checkApiCompatibility: async (apiBaseUrl) => {
        expect(apiBaseUrl).toBe('http://127.0.0.1:3001/v1');
        return result;
      }
    })).resolves.toEqual(metadata);
  });

  it('formats upload compatibility failures with fix and retry commands', async () => {
    const result: ApiCompatibilityCheckResult = {
      ok: true,
      compatible: false,
      url: 'http://127.0.0.1:3001/v1/metadata',
      status: 200,
      error: 'contract mismatch'
    };

    await expect(requireApiCompatibilityBeforeUpload('http://127.0.0.1:3001/v1', {
      retryCommand: 'agentfeed publish --id draft_123 --yes',
      checkApiCompatibility: async () => result
    })).rejects.toThrow([
      'API compatibility check failed for http://127.0.0.1:3001/v1/metadata: HTTP 200: contract mismatch before uploading drafts.',
      '',
      'Fix first:',
      'Run: agentfeed doctor',
      'Run: agentfeed status',
      '',
      'Then retry:',
      'Run: agentfeed publish --id draft_123 --yes'
    ].join('\n'));
  });

  it('adds machine-readable doctor guidance for compatibility failures without an HTTP status', async () => {
    const result: ApiCompatibilityCheckResult = {
      ok: false,
      compatible: false,
      url: 'http://127.0.0.1:3001/v1/metadata',
      error: 'Network error while checking AgentFeed API'
    };

    await expect(requireApiCompatibilityBeforeUpload('http://127.0.0.1:3001/v1', {
      checkApiCompatibility: async () => result
    })).rejects.toThrow([
      'API compatibility check failed for http://127.0.0.1:3001/v1/metadata: Network error while checking AgentFeed API before uploading drafts.',
      '',
      'Fix first:',
      'Run: agentfeed doctor',
      'Run: agentfeed status',
      'Run: agentfeed doctor --json'
    ].join('\n'));
  });

  it('formats ingestion token failures with login, rotate, status, and retry commands', async () => {
    const result: ApiCheckResult = {
      ok: false,
      url: 'http://127.0.0.1:3001/v1/ingest/status',
      status: 401,
      error: 'invalid ingestion token'
    };

    await expect(requireIngestionTokenBeforeUpload(credentials(), {
      retryCommand: 'agentfeed share --upload --yes',
      checkIngestionToken: async (input) => {
        expect(input).toEqual(credentials());
        return result;
      }
    })).rejects.toThrow([
      'Ingestion token check failed for http://127.0.0.1:3001/v1/ingest/status: HTTP 401: invalid ingestion token before uploading drafts.',
      '',
      'Fix first:',
      'Run: agentfeed login',
      'Run: agentfeed rotate',
      'Run: agentfeed status',
      '',
      'Then retry:',
      'Run: agentfeed share --upload --yes'
    ].join('\n'));
  });

  it('prioritizes clearing AGENTFEED_TOKEN when env-token ingestion preflight fails', async () => {
    const previousToken = process.env.AGENTFEED_TOKEN;
    process.env.AGENTFEED_TOKEN = 'af_live_stale_env_token';
    const result: ApiCheckResult = {
      ok: false,
      url: 'http://127.0.0.1:3001/v1/ingest/status',
      status: 401,
      error: 'invalid ingestion token'
    };

    try {
      await expect(requireIngestionTokenBeforeUpload(credentials(), {
        checkIngestionToken: async () => result
      })).rejects.toThrow([
        'Ingestion token check failed for http://127.0.0.1:3001/v1/ingest/status: HTTP 401: invalid ingestion token before uploading drafts.',
        '',
        'Fix first:',
        'Run: unset AGENTFEED_TOKEN',
        'Run: agentfeed status',
        'Run: agentfeed login',
        'Run: agentfeed rotate'
      ].join('\n'));
    } finally {
      if (previousToken === undefined) delete process.env.AGENTFEED_TOKEN;
      else process.env.AGENTFEED_TOKEN = previousToken;
    }
  });

  it('checks API compatibility before checking the ingestion token', async () => {
    const metadata = compatibleMetadata();
    let compatibilityChecks = 0;
    let tokenChecks = 0;

    await expect(requireUploadPreflight(credentials(), {
      checkApiCompatibility: async () => {
        compatibilityChecks += 1;
        expect(tokenChecks).toBe(0);
        return {
          ok: true,
          compatible: true,
          url: 'http://127.0.0.1:3001/v1/metadata',
          status: 200,
          data: metadata
        };
      },
      checkIngestionToken: async () => {
        tokenChecks += 1;
        expect(compatibilityChecks).toBe(1);
        return {
          ok: true,
          url: 'http://127.0.0.1:3001/v1/ingest/status',
          status: 200
        };
      }
    })).resolves.toEqual(metadata);

    expect(compatibilityChecks).toBe(1);
    expect(tokenChecks).toBe(1);
  });

  it('formats credential-save compatibility failures before saving credentials', async () => {
    const result: ApiCompatibilityCheckResult = {
      ok: true,
      compatible: false,
      url: 'http://127.0.0.1:3001/v1/metadata',
      status: 200,
      error: 'contract mismatch'
    };

    await expect(requireApiCompatibilityBeforeCredentialSave('http://127.0.0.1:3001/v1', {
      checkApiCompatibility: async () => result
    })).rejects.toThrow([
      'API compatibility check failed for http://127.0.0.1:3001/v1/metadata: HTTP 200: contract mismatch before saving credentials.',
      'Run: agentfeed doctor'
    ].join('\n'));
  });
});

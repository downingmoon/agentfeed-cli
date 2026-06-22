import { describe, expect, it } from 'vitest';
import { requireIngestionTokenBeforeUpload } from '../src/cli/upload-preflight.js';
import type { ApiCheckResult } from '../src/api/client.js';
import type { AgentFeedCredentials } from '../src/types.js';

function credentials(): AgentFeedCredentials {
  return {
    api_base_url: 'http://127.0.0.1:3001/v1',
    ingestion_token: 'af_live_test',
    created_at: '2026-06-12T00:00:00.000Z'
  };
}

describe('upload preflight ingestion token recovery', () => {
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

  it('includes credential context when a saved-token ingestion preflight fails', async () => {
    const result: ApiCheckResult = {
      ok: false,
      url: 'http://127.0.0.1:3001/v1/ingest/status',
      status: 401,
      error: 'invalid ingestion token'
    };

    await expect(requireIngestionTokenBeforeUpload(credentials(), {
      retryCommand: 'agentfeed publish --id draft_context --yes',
      credentialContext: {
        tokenSourceLabel: 'OS keychain',
        credentialStoreLabel: 'OS keychain',
        apiBaseUrl: 'http://127.0.0.1:3001/v1',
        apiBaseSourceLabel: 'saved credentials file',
        credentialsFilePath: '/Users/test/.agentfeed/credentials.json'
      },
      checkIngestionToken: async () => result
    })).rejects.toThrow([
      'Ingestion token check failed for http://127.0.0.1:3001/v1/ingest/status: HTTP 401: invalid ingestion token before uploading drafts.',
      '',
      'Fix first:',
      'Run: agentfeed login',
      'Run: agentfeed rotate',
      'Run: agentfeed status',
      '',
      'Credential context:',
      '- User/token source: OS keychain',
      '- Credential store: OS keychain',
      '- API base URL: http://127.0.0.1:3001/v1',
      '- API base URL source: saved credentials file',
      '- Credentials file: /Users/test/.agentfeed/credentials.json',
      '- AGENTFEED_TOKEN is not exported by browser login; an empty echo "$AGENTFEED_TOKEN" can be normal when using saved credentials.',
      '',
      'Then retry:',
      'Run: agentfeed publish --id draft_context --yes'
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

  it('prioritizes status when API base env may override saved-token host', async () => {
    const previousBaseUrl = process.env.AGENTFEED_API_BASE_URL;
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8001/v1';
    const result: ApiCheckResult = {
      ok: false,
      url: 'http://localhost:8001/v1/ingest/status',
      status: 401,
      error: 'invalid ingestion token'
    };

    try {
      await expect(requireIngestionTokenBeforeUpload(credentials(), {
        checkIngestionToken: async () => result
      })).rejects.toThrow([
        'Ingestion token check failed for http://localhost:8001/v1/ingest/status: HTTP 401: invalid ingestion token before uploading drafts.',
        '',
        'Fix first:',
        'Run: agentfeed status',
        'Run: agentfeed login',
        'Run: agentfeed rotate'
      ].join('\n'));
    } finally {
      if (previousBaseUrl === undefined) delete process.env.AGENTFEED_API_BASE_URL;
      else process.env.AGENTFEED_API_BASE_URL = previousBaseUrl;
    }
  });
});

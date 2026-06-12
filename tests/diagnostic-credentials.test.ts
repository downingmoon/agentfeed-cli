import { describe, expect, it } from 'vitest';
import {
  invalidApiBaseUrlMessage,
  loadDiagnosticCredentialsWithMetadata
} from '../src/cli/diagnostic-credentials.js';
import type { CredentialsResolution } from '../src/config/credentials.js';

function savedCredentialsResolution(): CredentialsResolution {
  return {
    credentials: {
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_saved',
      created_at: '2026-06-12T00:00:00.000Z'
    },
    token_source: 'credentials_file',
    credentials_file_path: '/tmp/agentfeed/credentials.json',
    credentials_file_exists: true,
    credential_store: 'file',
    api_base_url: 'https://api.agentfeed.dev/v1',
    api_base_url_source: 'credentials',
    api_base_url_source_detail: 'credentials.json',
    warnings: []
  };
}

describe('diagnostic credentials metadata', () => {
  it('returns normal credential metadata unchanged when the API base URL is valid', async () => {
    const metadata = savedCredentialsResolution();

    await expect(loadDiagnosticCredentialsWithMetadata({
      cwd: '/repo',
      dependencies: {
        loadCredentialsWithMetadata: async (options) => {
          expect(options).toEqual({ cwd: '/repo' });
          return metadata;
        }
      }
    })).resolves.toEqual({ metadata, invalidApiBaseUrl: false });
  });

  it('converts invalid API base URL failures into diagnostic metadata without losing environment token state', async () => {
    let checkedPath = '';

    const result = await loadDiagnosticCredentialsWithMetadata({
      dependencies: {
        env: {
          AGENTFEED_TOKEN: 'af_live_env',
          AGENTFEED_API_BASE_URL: ' http://127.0.0.1:3001/v1 '
        },
        credentialsPath: () => '/tmp/agentfeed/credentials.json',
        pathExists: async (path) => {
          checkedPath = path;
          return true;
        },
        loadCredentialsWithMetadata: async () => {
          throw new Error('Invalid AgentFeed API base URL: http://127.0.0.1:3001/v1 requires AGENTFEED_ALLOW_INSECURE_API=1.');
        }
      }
    });

    expect(checkedPath).toBe('/tmp/agentfeed/credentials.json');
    expect(result).toEqual({
      invalidApiBaseUrl: true,
      metadata: {
        credentials: null,
        token_source: 'environment',
        credentials_file_path: '/tmp/agentfeed/credentials.json',
        credentials_file_exists: true,
        credential_store: 'environment',
        api_base_url: 'invalid (http://127.0.0.1:3001/v1)',
        api_base_url_source: 'environment',
        api_base_url_source_detail: 'AGENTFEED_API_BASE_URL',
        warnings: [
          'invalid AgentFeed API URL setting ignored for diagnostics: Invalid AgentFeed API base URL: http://127.0.0.1:3001/v1 requires AGENTFEED_ALLOW_INSECURE_API=1.',
          'Fix AGENTFEED_API_BASE_URL, unset it, or set AGENTFEED_ALLOW_INSECURE_API=1 for explicit development-only HTTP testing.'
        ]
      }
    });
  });

  it('marks invalid API base URL diagnostics as missing credentials when no environment token is set', async () => {
    const result = await loadDiagnosticCredentialsWithMetadata({
      dependencies: {
        env: {
          AGENTFEED_TOKEN: '',
          AGENTFEED_API_BASE_URL: '   '
        },
        credentialsPath: () => '/tmp/agentfeed/missing-credentials.json',
        pathExists: async () => false,
        loadCredentialsWithMetadata: async () => {
          throw new Error('Invalid AgentFeed API base URL: empty value.');
        }
      }
    });

    expect(result.metadata.token_source).toBe('missing');
    expect(result.metadata.credential_store).toBe('missing');
    expect(result.metadata.credentials_file_exists).toBe(false);
    expect(result.metadata.api_base_url).toBe('invalid');
  });

  it('rethrows non-API-base credential failures', async () => {
    await expect(loadDiagnosticCredentialsWithMetadata({
      dependencies: {
        loadCredentialsWithMetadata: async () => {
          throw new Error('keychain unavailable');
        }
      }
    })).rejects.toThrow('keychain unavailable');
  });

  it('extracts only invalid API base URL error messages', () => {
    expect(invalidApiBaseUrlMessage(new Error('Invalid AgentFeed API base URL: bad'))).toBe('Invalid AgentFeed API base URL: bad');
    expect(invalidApiBaseUrlMessage(new Error('other failure'))).toBeNull();
    expect(invalidApiBaseUrlMessage('Invalid AgentFeed API base URL: string error')).toBeNull();
  });
});

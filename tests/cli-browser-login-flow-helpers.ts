import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, vi } from 'vitest';
import { initProject } from '../src/config/project-config.js';

const oldHome = process.env.HOME;
const oldAgentFeedCi = process.env.AGENTFEED_CI;
const oldCi = process.env.CI;
const oldGithubActions = process.env.GITHUB_ACTIONS;
const oldAgentFeedToken = process.env.AGENTFEED_TOKEN;
const oldTrustRepoApiBase = process.env.AGENTFEED_TRUST_REPO_API_BASE;

export type BrowserLoginFlowFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly credentialsPath: () => string;
};

export function useBrowserLoginFlowFixture(): BrowserLoginFlowFixture {
  let dir = '';
  let home = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-login-'));
    home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
    process.env.HOME = home;
    await initProject({ cwd: dir, noGitCheck: true });
  });

  afterEach(async () => {
    restoreEnvironment();
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  return {
    dir: () => dir,
    home: () => home,
    credentialsPath: () => join(home, '.agentfeed', 'credentials.json')
  };
}

export function validIngestionStatusResponse(tokenId = 'token-login-ok'): Response {
  return new Response(JSON.stringify({
    data: {
      ok: true,
      user: { id: 'user-login-ok', username: 'cli-user', display_name: 'CLI User', avatar_url: null },
      token: {
        id: tokenId,
        name: 'CLI login token',
        created_at: '2026-06-01T00:00:00Z',
        last_used_at: null,
        expires_at: '2026-06-15T00:00:00Z',
        expires_in_seconds: 1_000_000,
        expiring_soon: false
      }
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

export function apiMetadataResponse(): Response {
  return new Response(JSON.stringify({
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
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

export function cliAuthSessionResponse(sessionId: string): Response {
  return new Response(JSON.stringify({
    data: {
      session_id: sessionId,
      authorize_url: `https://agentfeed.downingmoon.dev/cli/authorize?session_id=${sessionId}`,
      user_code: '123-456',
      expires_at: '2026-05-20T00:05:00Z',
      poll_interval_seconds: 1
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

export function parsedRequestBody(init: RequestInit | undefined): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(init?.body ?? '{}'));
  if (!isRecord(parsed)) throw new Error('expected request body object');
  return parsed;
}

function restoreEnvironment(): void {
  process.env.HOME = oldHome;
  restoreOptionalEnvironmentValue('AGENTFEED_CI', oldAgentFeedCi);
  restoreOptionalEnvironmentValue('CI', oldCi);
  restoreOptionalEnvironmentValue('GITHUB_ACTIONS', oldGithubActions);
  restoreOptionalEnvironmentValue('AGENTFEED_TOKEN', oldAgentFeedToken);
  restoreOptionalEnvironmentValue('AGENTFEED_TRUST_REPO_API_BASE', oldTrustRepoApiBase);
}

function restoreOptionalEnvironmentValue(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

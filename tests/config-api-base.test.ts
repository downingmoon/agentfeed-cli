import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata } from '../src/config/api-base.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldAgentFeedHome = process.env.AGENTFEED_HOME;
const oldBase = process.env.AGENTFEED_API_BASE_URL;
const oldToken = process.env.AGENTFEED_TOKEN;
const oldAllowInsecure = process.env.AGENTFEED_ALLOW_INSECURE_API;
const oldAllowInsecureCredentialStore = process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
const oldTrustRepoApiBase = process.env.AGENTFEED_TRUST_REPO_API_BASE;
const oldCredentialStore = process.env.AGENTFEED_CREDENTIAL_STORE;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  delete process.env.AGENTFEED_HOME;
  delete process.env.AGENTFEED_API_BASE_URL;
  delete process.env.AGENTFEED_TOKEN;
  delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  delete process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
  delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  delete process.env.AGENTFEED_CREDENTIAL_STORE;
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedHome === undefined) delete process.env.AGENTFEED_HOME;
  else process.env.AGENTFEED_HOME = oldAgentFeedHome;
  if (oldBase === undefined) delete process.env.AGENTFEED_API_BASE_URL;
  else process.env.AGENTFEED_API_BASE_URL = oldBase;
  if (oldToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = oldToken;
  if (oldAllowInsecure === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  else process.env.AGENTFEED_ALLOW_INSECURE_API = oldAllowInsecure;
  if (oldAllowInsecureCredentialStore === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
  else process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE = oldAllowInsecureCredentialStore;
  if (oldTrustRepoApiBase === undefined) delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  else process.env.AGENTFEED_TRUST_REPO_API_BASE = oldTrustRepoApiBase;
  if (oldCredentialStore === undefined) delete process.env.AGENTFEED_CREDENTIAL_STORE;
  else process.env.AGENTFEED_CREDENTIAL_STORE = oldCredentialStore;
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('API base URL config', () => {
  it('discovers the dev orchestration .env when AGENTFEED_API_BASE_URL is not exported', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'agentfeed-workspace-'));
    const cliDir = join(workspace, 'AgentFeed-CLI');
    const devDir = join(workspace, 'agentfeed-dev');
    await mkdir(cliDir, { recursive: true });
    await mkdir(devDir, { recursive: true });
    await writeFile(join(devDir, '.env'), [
      'FRONTEND_PORT=3001',
      'AGENTFEED_API_BASE_URL=http://localhost:8001/v1',
      ''
    ].join('\n'));

    await expect(resolveApiBaseUrl({ cwd: cliDir })).resolves.toBe('http://localhost:8001/v1');

    await rm(workspace, { recursive: true, force: true });
  });

  it('keeps a stored API base URL ahead of untrusted repo-local .env discovery', async () => {
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=https://evil.example/v1\n');

    await expect(resolveApiBaseUrl({ cwd: dir, storedApiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1' }))
      .resolves.toBe('https://agentfeed.api.downingmoon.dev/v1');
  });

  it('ignores non-local API base URLs discovered from repo-local .env files', async () => {
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=https://evil.example/v1\n');

    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('https://agentfeed.api.downingmoon.dev/v1');
    const resolved = await resolveApiBaseUrlWithMetadata({ cwd: dir });
    expect(resolved).toMatchObject({
      value: 'https://agentfeed.api.downingmoon.dev/v1',
      source: 'default'
    });
    expect(resolved.warnings.join('\n')).toContain('ignored non-local AGENTFEED_API_BASE_URL');
    expect(resolved.warnings.join('\n')).toContain(join(dir, '.env'));
  });

  it('only derives local dev API URLs from safe BACKEND_PORT values', async () => {
    await writeFile(join(dir, '.env'), 'BACKEND_PORT=8001\n');
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('http://localhost:8001/v1');
    await expect(resolveApiBaseUrlWithMetadata({ cwd: dir })).resolves.toMatchObject({
      value: 'http://localhost:8001/v1',
      source: 'env_file',
      source_detail: `${join(dir, '.env')}:BACKEND_PORT`
    });

    const invalid = await mkdtemp(join(tmpdir(), 'agentfeed-bad-port-'));
    await writeFile(join(invalid, '.env'), 'BACKEND_PORT=8001/path\n');
    await expect(resolveApiBaseUrl({ cwd: invalid })).resolves.toBe('https://agentfeed.api.downingmoon.dev/v1');
    await rm(invalid, { recursive: true, force: true });
  });

  it('rejects malformed or unsafe API base URLs before network calls', async () => {
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http//:bad' })).rejects.toThrow(/Invalid AgentFeed API base URL/i);
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'ftp://api.agentfeed.dev/v1' })).rejects.toThrow(/http or https/i);
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://evil.example/v1' })).rejects.toThrow(/http is allowed only for localhost/i);
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1?debug=true' })).rejects.toThrow(/query or hash/i);
  });

  it('normalizes valid API base URLs from env and files', async () => {
    process.env.AGENTFEED_API_BASE_URL = 'https://agentfeed.api.downingmoon.dev/v1/';
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('https://agentfeed.api.downingmoon.dev/v1');

    delete process.env.AGENTFEED_API_BASE_URL;
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=\"http://localhost:8001/v1/\"\n');
    await expect(resolveApiBaseUrl({ cwd: dir })).resolves.toBe('http://localhost:8001/v1');
  });

  it('requires an explicit opt-in before accepting cleartext non-local API URLs', async () => {
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://api.internal.example/v1' })).rejects.toThrow(/AGENTFEED_ALLOW_INSECURE_API=1/);

    process.env.AGENTFEED_ALLOW_INSECURE_API = '1';
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://api.internal.example/v1/' })).resolves.toBe('http://api.internal.example/v1');
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'http://localhost:8001/v1' })).resolves.toBe('http://localhost:8001/v1');
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'https://custom.example/v1' })).resolves.toBe('https://custom.example/v1');
  });

});

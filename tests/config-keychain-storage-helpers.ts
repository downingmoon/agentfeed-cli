import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import type { SecretStore } from '../src/config/credentials.js';

type EnvSnapshot = {
  readonly home?: string;
  readonly agentFeedHome?: string;
  readonly apiBaseUrl?: string;
  readonly token?: string;
  readonly allowInsecureApi?: string;
  readonly allowInsecureCredentialStore?: string;
  readonly trustRepoApiBase?: string;
  readonly credentialStore?: string;
};

export type KeychainStorageFixture = {
  readonly dir: () => string;
  readonly home: () => string;
  readonly hostHome: () => string | undefined;
};

export type MutableSecretStore = {
  readonly store: SecretStore;
  readonly savedSecret: () => string | null;
  readonly deleteCalled: () => boolean;
};

const envSnapshot: EnvSnapshot = {
  home: process.env.HOME,
  agentFeedHome: process.env.AGENTFEED_HOME,
  apiBaseUrl: process.env.AGENTFEED_API_BASE_URL,
  token: process.env.AGENTFEED_TOKEN,
  allowInsecureApi: process.env.AGENTFEED_ALLOW_INSECURE_API,
  allowInsecureCredentialStore: process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE,
  trustRepoApiBase: process.env.AGENTFEED_TRUST_REPO_API_BASE,
  credentialStore: process.env.AGENTFEED_CREDENTIAL_STORE,
};

export function useKeychainStorageFixture(): KeychainStorageFixture {
  let dir = '';
  let home = '';

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
    restoreEnv('HOME', envSnapshot.home);
    restoreEnv('AGENTFEED_HOME', envSnapshot.agentFeedHome);
    restoreEnv('AGENTFEED_API_BASE_URL', envSnapshot.apiBaseUrl);
    restoreEnv('AGENTFEED_TOKEN', envSnapshot.token);
    restoreEnv('AGENTFEED_ALLOW_INSECURE_API', envSnapshot.allowInsecureApi);
    restoreEnv('AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE', envSnapshot.allowInsecureCredentialStore);
    restoreEnv('AGENTFEED_TRUST_REPO_API_BASE', envSnapshot.trustRepoApiBase);
    restoreEnv('AGENTFEED_CREDENTIAL_STORE', envSnapshot.credentialStore);
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  return {
    dir: () => dir,
    home: () => home,
    hostHome: () => envSnapshot.home,
  };
}

export function mutableSecretStore(account: string): MutableSecretStore {
  let savedSecret: string | null = null;
  let deleteCalled = false;
  return {
    store: {
      service: 'AgentFeed CLI Test',
      account,
      async isAvailable() { return true; },
      async read() { return savedSecret; },
      async write(secret: string) { savedSecret = secret; },
      async delete() { deleteCalled = true; savedSecret = null; },
    },
    savedSecret: () => savedSecret,
    deleteCalled: () => deleteCalled,
  };
}

export function unavailableSecretStore(account: string): SecretStore {
  return {
    service: 'AgentFeed CLI Test',
    account,
    async isAvailable() { return false; },
    async read() { return null; },
    async write() { throw new Error('unavailable'); },
  };
}

export function failingSecretStore(account: string): SecretStore {
  return {
    service: 'AgentFeed CLI Test',
    account,
    async isAvailable() { return true; },
    async read() { return null; },
    async write() { throw new Error('locked keychain'); },
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

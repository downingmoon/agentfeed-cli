import { afterEach, beforeEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialsPath, globalAgentFeedDir } from '../src/config/credentials.js';

const oldHome = process.env.HOME;
const oldAgentFeedHome = process.env.AGENTFEED_HOME;
const oldBase = process.env.AGENTFEED_API_BASE_URL;
const oldToken = process.env.AGENTFEED_TOKEN;
const oldAllowInsecure = process.env.AGENTFEED_ALLOW_INSECURE_API;
const oldAllowInsecureCredentialStore = process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
const oldTrustRepoApiBase = process.env.AGENTFEED_TRUST_REPO_API_BASE;
const oldCredentialStore = process.env.AGENTFEED_CREDENTIAL_STORE;

export type CredentialResolutionFixture = {
  readonly dir: () => string;
  readonly credentialsPath: () => string;
  readonly writeCredentialsFile: (value: Record<string, unknown>) => Promise<void>;
  readonly writeMalformedCredentialsFile: (value: string) => Promise<void>;
};

export function useCredentialResolutionFixture(): CredentialResolutionFixture {
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
    restoreEnvironment();
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  return {
    dir: () => dir,
    credentialsPath,
    writeCredentialsFile,
    writeMalformedCredentialsFile,
  };
}

async function writeCredentialsFile(value: Record<string, unknown>): Promise<void> {
  await mkdir(globalAgentFeedDir(), { recursive: true });
  await writeFile(credentialsPath(), JSON.stringify(value, null, 2));
}

async function writeMalformedCredentialsFile(value: string): Promise<void> {
  await mkdir(globalAgentFeedDir(), { recursive: true });
  await writeFile(credentialsPath(), value);
}

function restoreEnvironment(): void {
  process.env.HOME = oldHome;
  restoreOptionalEnvironmentValue('AGENTFEED_HOME', oldAgentFeedHome);
  restoreOptionalEnvironmentValue('AGENTFEED_API_BASE_URL', oldBase);
  restoreOptionalEnvironmentValue('AGENTFEED_TOKEN', oldToken);
  restoreOptionalEnvironmentValue('AGENTFEED_ALLOW_INSECURE_API', oldAllowInsecure);
  restoreOptionalEnvironmentValue('AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE', oldAllowInsecureCredentialStore);
  restoreOptionalEnvironmentValue('AGENTFEED_TRUST_REPO_API_BASE', oldTrustRepoApiBase);
  restoreOptionalEnvironmentValue('AGENTFEED_CREDENTIAL_STORE', oldCredentialStore);
}

function restoreOptionalEnvironmentValue(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

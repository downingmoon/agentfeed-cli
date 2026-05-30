import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { AgentFeedCredentials } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { DEFAULT_API_BASE_URL } from './defaults.js';
import { normalizeApiBaseUrl, resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlResolution } from './api-base.js';

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = 'AgentFeed CLI';
const KEYCHAIN_TIMEOUT_MS = 5_000;

export type CredentialTokenSource = 'environment' | 'credentials_file' | 'keychain' | 'missing';
export type CredentialStorePreference = 'auto' | 'file' | 'keychain';

type PersistedCredentialStore = 'file' | 'keychain';

type StoredCredentialRecord = Partial<AgentFeedCredentials> & {
  credential_store?: PersistedCredentialStore;
  keychain_service?: string;
  keychain_account?: string;
};

export interface SecretStore {
  service: string;
  account: string;
  isAvailable(): Promise<boolean>;
  read(): Promise<string | null>;
  write(secret: string): Promise<void>;
  delete?(): Promise<void>;
}

export interface CredentialsResolution {
  credentials: AgentFeedCredentials | null;
  token_source: CredentialTokenSource;
  credentials_file_path: string;
  credentials_file_exists: boolean;
  credential_store: PersistedCredentialStore | 'environment' | 'missing';
  api_base_url?: string;
  api_base_url_source?: ApiBaseUrlResolution['source'];
  api_base_url_source_detail?: string;
  warnings: string[];
}

interface CredentialStoreOptions {
  credentialStore?: CredentialStorePreference;
  secretStore?: SecretStore;
}

export function resolveHomeDir(env: NodeJS.ProcessEnv = process.env, osHome = homedir()): string {
  const home = env.AGENTFEED_HOME || env.HOME || env.USERPROFILE || osHome;
  if (!home?.trim()) {
    throw new Error('Unable to determine a safe AgentFeed home directory. Set AGENTFEED_HOME or HOME before saving credentials.');
  }
  return home;
}

export function homeDir(): string {
  return resolveHomeDir();
}

export function globalAgentFeedDir(): string {
  return join(homeDir(), '.agentfeed');
}

export function credentialsPath(): string {
  return join(globalAgentFeedDir(), 'credentials.json');
}

async function ensurePrivateAgentFeedDir(): Promise<void> {
  const dir = globalAgentFeedDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try { await chmod(dir, 0o700); } catch { /* best-effort on non-POSIX filesystems */ }
}

async function writePrivateJsonFile(value: unknown): Promise<void> {
  await writeFile(credentialsPath(), `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  try { await chmod(credentialsPath(), 0o600); } catch { /* best-effort on non-POSIX filesystems */ }
}

async function writePrivateCredentialsFile(credentials: AgentFeedCredentials): Promise<void> {
  await writePrivateJsonFile({ ...credentials, credential_store: 'file' satisfies PersistedCredentialStore });
}

async function writeKeychainMetadataFile(credentials: AgentFeedCredentials, store: SecretStore): Promise<void> {
  const { ingestion_token: _token, ...metadata } = credentials;
  await writePrivateJsonFile({
    ...metadata,
    credential_store: 'keychain' satisfies PersistedCredentialStore,
    keychain_service: store.service,
    keychain_account: store.account,
  });
}

async function readCredentialsFile(file: string): Promise<{ credentials: StoredCredentialRecord | null; warnings: string[] }> {
  try {
    return { credentials: await readJson<StoredCredentialRecord>(file), warnings: [] };
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
    return {
      credentials: null,
      warnings: [`ignored malformed AgentFeed credentials file: ${file}.${reason}`]
    };
  }
}

function parseCredentialStorePreference(value: string | undefined): CredentialStorePreference | null {
  if (value === undefined || value === '') return null;
  const normalized = value.toLowerCase();
  return normalized === 'auto' || normalized === 'file' || normalized === 'keychain' ? normalized : null;
}

function credentialStorePreference(explicit?: CredentialStorePreference): CredentialStorePreference {
  if (explicit) return explicit;
  const envPreference = parseCredentialStorePreference(process.env.AGENTFEED_CREDENTIAL_STORE);
  if (envPreference) return envPreference;
  if (process.env.AGENTFEED_CREDENTIAL_STORE) {
    throw new Error('Invalid AGENTFEED_CREDENTIAL_STORE. Use one of: auto, file, keychain.');
  }
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return 'file';
  return 'auto';
}

function keychainAccount(): string {
  const digest = createHash('sha256').update(globalAgentFeedDir()).digest('hex').slice(0, 24);
  return `agentfeed-${digest}`;
}

async function commandAvailable(command: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    await execFileAsync(command, args, { timeout: 2_000 });
    return true;
  } catch {
    return false;
  }
}

function spawnWithInput(command: string, args: string[], input: string, timeoutMs = KEYCHAIN_TIMEOUT_MS): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code ?? 'unknown'}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
    child.stdin.end(input);
  });
}

function trimOneTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value.slice(0, -1) : value;
}

function nativeKeychainStore(metadata: { keychain_service?: string; keychain_account?: string } = {}): SecretStore {
  const service = metadata.keychain_service || KEYCHAIN_SERVICE;
  const account = metadata.keychain_account || keychainAccount();
  const currentPlatform = platform();

  if (currentPlatform === 'darwin') {
    return {
      service,
      account,
      async isAvailable() {
        return commandAvailable('security', ['-h']);
      },
      async read() {
        try {
          const { stdout } = await execFileAsync('security', ['find-generic-password', '-a', account, '-s', service, '-w'], { timeout: KEYCHAIN_TIMEOUT_MS });
          return trimOneTrailingNewline(stdout);
        } catch {
          return null;
        }
      },
      async write(secret: string) {
        await execFileAsync('security', ['add-generic-password', '-a', account, '-s', service, '-w', secret, '-U'], { timeout: KEYCHAIN_TIMEOUT_MS });
      },
      async delete() {
        try { await execFileAsync('security', ['delete-generic-password', '-a', account, '-s', service], { timeout: KEYCHAIN_TIMEOUT_MS }); } catch { /* item may not exist */ }
      },
    };
  }

  if (currentPlatform === 'linux') {
    return {
      service,
      account,
      async isAvailable() {
        return commandAvailable('secret-tool', ['--version']);
      },
      async read() {
        try {
          const { stdout } = await execFileAsync('secret-tool', ['lookup', 'service', service, 'account', account], { timeout: KEYCHAIN_TIMEOUT_MS });
          const secret = trimOneTrailingNewline(stdout);
          return secret || null;
        } catch {
          return null;
        }
      },
      async write(secret: string) {
        await spawnWithInput('secret-tool', ['store', '--label', 'AgentFeed CLI token', 'service', service, 'account', account], secret);
      },
      async delete() {
        try { await execFileAsync('secret-tool', ['clear', 'service', service, 'account', account], { timeout: KEYCHAIN_TIMEOUT_MS }); } catch { /* item may not exist */ }
      },
    };
  }

  return {
    service,
    account,
    async isAvailable() { return false; },
    async read() { return null; },
    async write() { throw new Error(`OS keychain credential storage is not available on ${currentPlatform}.`); },
  };
}

function trustRepoApiBaseForAuthenticatedUse(): boolean {
  return process.env.AGENTFEED_TRUST_REPO_API_BASE === '1';
}

function protectRepoDiscoveredApiBase(
  api: ApiBaseUrlResolution,
  hasToken: boolean,
): ApiBaseUrlResolution {
  if (!hasToken || api.source !== 'env_file' || trustRepoApiBaseForAuthenticatedUse()) return api;
  const detail = api.source_detail ? ` (${api.source_detail})` : '';
  return {
    value: normalizeApiBaseUrl(DEFAULT_API_BASE_URL),
    source: 'default',
    warnings: [
      ...api.warnings,
      `ignored repo-local API base${detail} for authenticated token use; set AGENTFEED_TRUST_REPO_API_BASE=1 to explicitly trust this checkout.`
    ]
  };
}

export async function credentialsFromToken(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } = {}): Promise<AgentFeedCredentials> {
  return {
    api_base_url: await resolveApiBaseUrl({ explicitApiBaseUrl: options.apiBaseUrl, cwd: options.cwd, trustRepoDiscoveredApiBase: options.trustRepoDiscoveredApiBase }),
    ingestion_token: token,
    token_expires_at: options.tokenExpiresAt ?? null,
    user: options.user,
    created_at: new Date().toISOString()
  };
}

export async function saveCredentials(token: string, options: { apiBaseUrl?: string; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } & CredentialStoreOptions = {}): Promise<AgentFeedCredentials> {
  const credentials = await credentialsFromToken(token, options);
  await ensurePrivateAgentFeedDir();
  const preference = credentialStorePreference(options.credentialStore);

  if (preference !== 'file') {
    const store = options.secretStore ?? nativeKeychainStore();
    const keychainAvailable = await store.isAvailable();
    if (keychainAvailable) {
      try {
        await store.write(token);
        await writeKeychainMetadataFile(credentials, store);
        return credentials;
      } catch (error) {
        if (preference === 'keychain') {
          const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
          throw new Error(`Unable to save AgentFeed credentials to the OS keychain.${detail}`);
        }
      }
    } else if (preference === 'keychain') {
      throw new Error('OS keychain credential storage is not available. Use AGENTFEED_CREDENTIAL_STORE=file to save an encrypted-at-rest alternative externally, or AGENTFEED_TOKEN for environment-managed secrets.');
    }
  }

  await writePrivateCredentialsFile(credentials);
  return credentials;
}

export async function loadCredentials(): Promise<AgentFeedCredentials | null> {
  return (await loadCredentialsWithMetadata()).credentials;
}

export async function resolveCredentials(base: AgentFeedCredentials | null): Promise<AgentFeedCredentials> {
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  if (!token) throw new Error('AgentFeed token is missing. Run: agentfeed login --token <token>');
  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ storedApiBaseUrl: base?.api_base_url }),
    Boolean(token),
  );
  const apiBaseUrl = api.value;
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  return {
    api_base_url: apiBaseUrl,
    ingestion_token: token,
    token_expires_at: tokenExpiresAt,
    user: base?.user,
    created_at: base?.created_at || new Date().toISOString()
  };
}

async function tokenFromStoredCredentials(base: StoredCredentialRecord | null, options: CredentialStoreOptions): Promise<{ token: string | null; source: Exclude<CredentialTokenSource, 'environment'>; warnings: string[] }> {
  if (base?.ingestion_token) return { token: base.ingestion_token, source: 'credentials_file', warnings: [] };
  if (base?.credential_store !== 'keychain') return { token: null, source: 'missing', warnings: [] };

  const store = options.secretStore ?? nativeKeychainStore({ keychain_service: base.keychain_service, keychain_account: base.keychain_account });
  try {
    if (!await store.isAvailable()) {
      return { token: null, source: 'missing', warnings: ['saved AgentFeed credentials use the OS keychain, but no supported keychain command is available on this host.'] };
    }
    const token = await store.read();
    if (!token) {
      return { token: null, source: 'missing', warnings: ['saved AgentFeed keychain metadata exists, but the token was not found in the OS keychain. Run: agentfeed login'] };
    }
    return { token, source: 'keychain', warnings: [] };
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
    return { token: null, source: 'missing', warnings: [`saved AgentFeed keychain credential could not be read.${detail}`] };
  }
}

export async function loadCredentialsWithMetadata(options: { cwd?: string } & CredentialStoreOptions = {}): Promise<CredentialsResolution> {
  const file = credentialsPath();
  const fileExists = await pathExists(file);
  const fileResult = fileExists ? await readCredentialsFile(file) : { credentials: null, warnings: [] };
  const base = fileResult.credentials;
  const stored = process.env.AGENTFEED_TOKEN
    ? { token: null, source: 'missing' as const, warnings: [] }
    : await tokenFromStoredCredentials(base, options);
  const token = process.env.AGENTFEED_TOKEN || stored.token;
  const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN
    ? 'environment'
    : stored.token
      ? stored.source
      : 'missing';

  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ cwd: options.cwd, storedApiBaseUrl: base?.api_base_url }),
    Boolean(token),
  );
  const warnings = [...fileResult.warnings, ...stored.warnings, ...api.warnings];
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  const credentialStore = process.env.AGENTFEED_TOKEN
    ? 'environment'
    : tokenSource === 'keychain'
      ? 'keychain'
      : tokenSource === 'credentials_file'
        ? 'file'
        : base?.credential_store === 'keychain'
          ? 'keychain'
          : 'missing';

  if (!token) {
    return {
      credentials: null,
      token_source: 'missing',
      credentials_file_path: file,
      credentials_file_exists: fileExists,
      credential_store: credentialStore,
      api_base_url: api.value,
      api_base_url_source: api.source,
      api_base_url_source_detail: api.source_detail,
      warnings
    };
  }

  return {
    credentials: {
      api_base_url: api.value,
      ingestion_token: token,
      token_expires_at: tokenExpiresAt,
      user: base?.user,
      created_at: base?.created_at || new Date().toISOString()
    },
    token_source: tokenSource,
    credentials_file_path: file,
    credentials_file_exists: fileExists,
    credential_store: credentialStore,
    api_base_url: api.value,
    api_base_url_source: api.source,
    api_base_url_source_detail: api.source_detail,
    warnings
  };
}

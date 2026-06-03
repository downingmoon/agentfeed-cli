import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, rm } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { AgentFeedCredentials } from '../types.js';
import { pathExists, readJson, writeTextFileAtomic } from '../utils/fs.js';
import { createScrubbedCommandEnv } from '../utils/subprocess-env.js';
import { DEFAULT_API_BASE_URL } from './defaults.js';
import { normalizeApiBaseUrl, resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlResolution } from './api-base.js';

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = 'AgentFeed CLI';
const KEYCHAIN_TIMEOUT_MS = 5_000;
const INSECURE_CREDENTIAL_STORE_FALLBACK_ENV = 'AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE';

export type CredentialTokenSource = 'environment' | 'credentials_file' | 'keychain' | 'missing';
export type CredentialStorePreference = 'auto' | 'file' | 'keychain';

type PersistedCredentialStore = 'file' | 'keychain';

type StoredCredentialRecord = Partial<AgentFeedCredentials> & {
  credential_store?: PersistedCredentialStore;
  keychain_service?: string;
  keychain_account?: string;
  credential_store_warning?: string;
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

export interface CredentialsDeleteResult {
  credentials_file_path: string;
  credentials_file_deleted: boolean;
  keychain_deleted: boolean | null;
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
  await writeTextFileAtomic(credentialsPath(), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  try { await chmod(credentialsPath(), 0o600); } catch { /* best-effort on non-POSIX filesystems */ }
}

async function writePrivateCredentialsFile(credentials: AgentFeedCredentials, warning?: string): Promise<void> {
  await writePrivateJsonFile({
    ...credentials,
    credential_store: 'file' satisfies PersistedCredentialStore,
    ...(warning ? { credential_store_warning: warning } : {})
  });
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


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidCredentialWarning(file: string, field: string, expected: string): string {
  return `ignored invalid AgentFeed credentials field ${field} in ${file}: expected ${expected}. Run agentfeed login to refresh saved credentials.`;
}

function optionalStoredString(record: Record<string, unknown>, field: string, file: string, warnings: string[]): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  warnings.push(invalidCredentialWarning(file, field, 'a string'));
  return undefined;
}

function optionalStoredStringOrNull(record: Record<string, unknown>, field: string, file: string, warnings: string[]): string | null | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string') return value;
  warnings.push(invalidCredentialWarning(file, field, 'a string or null'));
  return undefined;
}

function normalizeStoredUser(value: unknown, file: string, warnings: string[]): AgentFeedCredentials['user'] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(invalidCredentialWarning(file, 'user', 'an object'));
    return undefined;
  }
  const id = optionalStoredString(value, 'id', file, warnings);
  const username = optionalStoredStringOrNull(value, 'username', file, warnings);
  const displayName = optionalStoredStringOrNull(value, 'display_name', file, warnings);
  const user: AgentFeedCredentials['user'] = {};
  if (id !== undefined) user.id = id;
  if (username !== undefined) user.username = username;
  if (displayName !== undefined) user.display_name = displayName;
  return user;
}

function normalizeStoredCredentials(value: unknown, file: string): { credentials: StoredCredentialRecord | null; warnings: string[] } {
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return {
      credentials: null,
      warnings: [`ignored malformed AgentFeed credentials file: ${file}. root must be an object. Run agentfeed login to refresh saved credentials.`]
    };
  }

  const credentials: StoredCredentialRecord = {};
  const apiBaseUrl = optionalStoredString(value, 'api_base_url', file, warnings);
  const ingestionToken = optionalStoredString(value, 'ingestion_token', file, warnings);
  const tokenId = optionalStoredStringOrNull(value, 'token_id', file, warnings);
  const tokenExpiresAt = optionalStoredStringOrNull(value, 'token_expires_at', file, warnings);
  const createdAt = optionalStoredString(value, 'created_at', file, warnings);
  const credentialStoreWarning = optionalStoredString(value, 'credential_store_warning', file, warnings);
  const keychainService = optionalStoredString(value, 'keychain_service', file, warnings);
  const keychainAccount = optionalStoredString(value, 'keychain_account', file, warnings);
  const user = normalizeStoredUser(value.user, file, warnings);

  if (apiBaseUrl !== undefined) credentials.api_base_url = apiBaseUrl;
  if (ingestionToken !== undefined) credentials.ingestion_token = ingestionToken;
  if (tokenId !== undefined) credentials.token_id = tokenId;
  if (tokenExpiresAt !== undefined) credentials.token_expires_at = tokenExpiresAt;
  if (createdAt !== undefined) credentials.created_at = createdAt;
  if (user !== undefined) credentials.user = user;
  if (credentialStoreWarning !== undefined) credentials.credential_store_warning = credentialStoreWarning;
  if (keychainService !== undefined) credentials.keychain_service = keychainService;
  if (keychainAccount !== undefined) credentials.keychain_account = keychainAccount;

  if (value.credential_store !== undefined) {
    if (value.credential_store === 'file' || value.credential_store === 'keychain') {
      credentials.credential_store = value.credential_store;
    } else {
      warnings.push(invalidCredentialWarning(file, 'credential_store', '"file" or "keychain"'));
    }
  }

  return { credentials, warnings };
}

async function readCredentialsFile(file: string): Promise<{ credentials: StoredCredentialRecord | null; warnings: string[] }> {
  try {
    return normalizeStoredCredentials(await readJson<unknown>(file), file);
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

function allowInsecureCredentialStoreFallback(): boolean {
  return process.env[INSECURE_CREDENTIAL_STORE_FALLBACK_ENV] === '1';
}

function credentialStoreFallbackRefusal(reason: 'unavailable' | 'failed', detail = ''): Error {
  const reasonText = reason === 'unavailable'
    ? 'OS keychain credential storage is not available'
    : 'OS keychain credential storage failed';
  return new Error(
    `${reasonText}; refusing to save the token in the local credentials file without explicit opt-in. ` +
    `Set AGENTFEED_CREDENTIAL_STORE=file to intentionally use file storage, or set ${INSECURE_CREDENTIAL_STORE_FALLBACK_ENV}=1 to allow auto fallback for this login.${detail}`
  );
}

function keychainAccount(): string {
  const digest = createHash('sha256').update(globalAgentFeedDir()).digest('hex').slice(0, 24);
  return `agentfeed-${digest}`;
}

function keychainCommandEnv(): NodeJS.ProcessEnv {
  return createScrubbedCommandEnv(process.env, { respectAllowlist: false });
}

async function commandAvailable(command: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    await execFileAsync(command, args, { timeout: 2_000, env: keychainCommandEnv() });
    return true;
  } catch {
    return false;
  }
}

function spawnWithInput(command: string, args: string[], input: string, timeoutMs = KEYCHAIN_TIMEOUT_MS): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: keychainCommandEnv() });
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

async function windowsPowerShellCommand(): Promise<string | null> {
  for (const command of ['powershell.exe', 'powershell', 'pwsh']) {
    if (await commandAvailable(command, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.Major'])) return command;
  }
  return null;
}

function windowsDpapiSecretPath(account: string): string {
  return join(globalAgentFeedDir(), `${account}.dpapi`);
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
          const { stdout } = await execFileAsync('security', ['find-generic-password', '-a', account, '-s', service, '-w'], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() });
          return trimOneTrailingNewline(stdout);
        } catch {
          return null;
        }
      },
      async write(secret: string) {
        await execFileAsync('security', ['add-generic-password', '-a', account, '-s', service, '-w', secret, '-U'], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() });
      },
      async delete() {
        try { await execFileAsync('security', ['delete-generic-password', '-a', account, '-s', service], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() }); } catch { /* item may not exist */ }
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
          const { stdout } = await execFileAsync('secret-tool', ['lookup', 'service', service, 'account', account], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() });
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
        try { await execFileAsync('secret-tool', ['clear', 'service', service, 'account', account], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() }); } catch { /* item may not exist */ }
      },
    };
  }

  if (currentPlatform === 'win32') {
    return {
      service,
      account,
      async isAvailable() {
        return (await windowsPowerShellCommand()) !== null;
      },
      async read() {
        const command = await windowsPowerShellCommand();
        if (!command) return null;
        try {
          const encryptedSecret = await readFile(windowsDpapiSecretPath(account), 'utf8');
          const { stdout } = await spawnWithInput(command, [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            [
              "$ErrorActionPreference = 'Stop'",
              'Add-Type -AssemblyName System.Security',
              '$blob = [Console]::In.ReadToEnd().Trim()',
              '$protected = [Convert]::FromBase64String($blob)',
              '$bytes = [System.Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
              '[System.Text.Encoding]::UTF8.GetString($bytes)',
            ].join('; '),
          ], encryptedSecret);
          const secret = trimOneTrailingNewline(stdout);
          return secret || null;
        } catch {
          return null;
        }
      },
      async write(secret: string) {
        const command = await windowsPowerShellCommand();
        if (!command) throw new Error('Windows PowerShell is not available for DPAPI credential storage.');
        const { stdout } = await spawnWithInput(command, [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          [
            "$ErrorActionPreference = 'Stop'",
            'Add-Type -AssemblyName System.Security',
            '$secret = [Console]::In.ReadToEnd()',
            '$bytes = [System.Text.Encoding]::UTF8.GetBytes($secret)',
            '$protected = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
            '[Convert]::ToBase64String($protected)',
          ].join('; '),
        ], secret);
        const encryptedSecret = trimOneTrailingNewline(stdout);
        if (!encryptedSecret) throw new Error('Windows DPAPI did not return an encrypted credential payload.');
        await writeTextFileAtomic(windowsDpapiSecretPath(account), `${encryptedSecret}\n`, { mode: 0o600 });
        try { await chmod(windowsDpapiSecretPath(account), 0o600); } catch { /* best-effort on non-POSIX filesystems */ }
      },
      async delete() {
        await rm(windowsDpapiSecretPath(account), { force: true });
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

function savedApiBaseUrlForTokenSource(base: StoredCredentialRecord | null, tokenSource: CredentialTokenSource): string | undefined {
  if (tokenSource === 'environment') return undefined;
  return base?.api_base_url;
}

function savedApiBaseWarnings(base: StoredCredentialRecord | null, tokenSource: CredentialTokenSource): string[] {
  if (tokenSource !== 'environment' || !base?.api_base_url || process.env.AGENTFEED_API_BASE_URL) return [];
  return ['ignored saved AgentFeed API base while using AGENTFEED_TOKEN; set AGENTFEED_API_BASE_URL to intentionally choose a non-default API host.'];
}

export async function credentialsFromToken(token: string, options: { apiBaseUrl?: string; tokenId?: string | null; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } = {}): Promise<AgentFeedCredentials> {
  return {
    api_base_url: await resolveApiBaseUrl({ explicitApiBaseUrl: options.apiBaseUrl, cwd: options.cwd, trustRepoDiscoveredApiBase: options.trustRepoDiscoveredApiBase }),
    ingestion_token: token,
    token_id: options.tokenId ?? null,
    token_expires_at: options.tokenExpiresAt ?? null,
    user: options.user,
    created_at: new Date().toISOString()
  };
}

export async function saveCredentials(token: string, options: { apiBaseUrl?: string; tokenId?: string | null; user?: AgentFeedCredentials['user']; tokenExpiresAt?: string | null; cwd?: string; trustRepoDiscoveredApiBase?: boolean } & CredentialStoreOptions = {}): Promise<AgentFeedCredentials> {
  const credentials = await credentialsFromToken(token, options);
  await ensurePrivateAgentFeedDir();
  const preference = credentialStorePreference(options.credentialStore);
  let fileFallbackWarning: string | undefined;

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
        const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
        if (!allowInsecureCredentialStoreFallback()) {
          throw credentialStoreFallbackRefusal('failed', detail);
        }
        fileFallbackWarning = `OS keychain credential storage failed; saved token in the private credentials file because ${INSECURE_CREDENTIAL_STORE_FALLBACK_ENV}=1.${detail}`;
      }
    } else if (preference === 'keychain') {
      throw new Error('OS keychain credential storage is not available. Use AGENTFEED_CREDENTIAL_STORE=file to intentionally save the token in the local credentials file, or AGENTFEED_TOKEN for environment-managed secrets.');
    } else {
      if (!allowInsecureCredentialStoreFallback()) {
        throw credentialStoreFallbackRefusal('unavailable');
      }
      fileFallbackWarning = `OS keychain credential storage is not available; saved token in the private credentials file because ${INSECURE_CREDENTIAL_STORE_FALLBACK_ENV}=1. Set AGENTFEED_CREDENTIAL_STORE=file to make file storage explicit without auto fallback.`;
    }
  }

  await writePrivateCredentialsFile(credentials, fileFallbackWarning);
  return credentials;
}

export async function deleteSavedCredentials(options: CredentialStoreOptions = {}): Promise<CredentialsDeleteResult> {
  const file = credentialsPath();
  const fileExists = await pathExists(file);
  const fileResult = fileExists ? await readCredentialsFile(file) : { credentials: null, warnings: [] };
  const base = fileResult.credentials;
  const warnings = [...fileResult.warnings];
  let keychainDeleted: boolean | null = null;

  if (base?.credential_store === 'keychain') {
    const store = options.secretStore ?? nativeKeychainStore({ keychain_service: base.keychain_service, keychain_account: base.keychain_account });
    try {
      if (await store.isAvailable()) {
        if (store.delete) {
          await store.delete();
          keychainDeleted = true;
        } else {
          keychainDeleted = false;
          warnings.push('saved AgentFeed credentials use a keychain backend that does not support deletion; revoke the token in AgentFeed Settings if needed.');
        }
      } else {
        keychainDeleted = false;
        warnings.push('saved AgentFeed credentials use the OS keychain, but no supported keychain command is available on this host; revoke the token in AgentFeed Settings if needed.');
      }
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
      keychainDeleted = false;
      warnings.push(`saved AgentFeed keychain credential could not be deleted.${detail} Revoke the token in AgentFeed Settings if needed.`);
    }
  }

  await rm(file, { force: true });
  return {
    credentials_file_path: file,
    credentials_file_deleted: fileExists,
    keychain_deleted: keychainDeleted,
    warnings,
  };
}

export async function loadCredentials(): Promise<AgentFeedCredentials | null> {
  return (await loadCredentialsWithMetadata()).credentials;
}

export async function resolveCredentials(base: AgentFeedCredentials | null): Promise<AgentFeedCredentials> {
  const token = process.env.AGENTFEED_TOKEN || base?.ingestion_token;
  if (!token) throw new Error('AgentFeed token is missing. Run: agentfeed login, or pipe a token with: printf %s "$TOKEN" | agentfeed login --token-stdin');
  const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN ? 'environment' : 'credentials_file';
  const api = protectRepoDiscoveredApiBase(
    await resolveApiBaseUrlWithMetadata({ storedApiBaseUrl: savedApiBaseUrlForTokenSource(base, tokenSource) }),
    Boolean(token),
  );
  const apiBaseUrl = api.value;
  const tokenExpiresAt = process.env.AGENTFEED_TOKEN ? null : base?.token_expires_at ?? null;
  return {
    api_base_url: apiBaseUrl,
    ingestion_token: token,
    token_id: process.env.AGENTFEED_TOKEN ? null : base?.token_id ?? null,
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
    await resolveApiBaseUrlWithMetadata({ cwd: options.cwd, storedApiBaseUrl: savedApiBaseUrlForTokenSource(base, tokenSource) }),
    Boolean(token),
  );
  const persistedStoreWarning = typeof base?.credential_store_warning === 'string' && base.credential_store_warning.trim()
    ? base.credential_store_warning
    : null;
  const warnings = [
    ...fileResult.warnings,
    ...stored.warnings,
    ...(persistedStoreWarning && tokenSource === 'credentials_file' ? [persistedStoreWarning] : []),
    ...savedApiBaseWarnings(base, tokenSource),
    ...api.warnings
  ];
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
      token_id: process.env.AGENTFEED_TOKEN ? null : base?.token_id ?? null,
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

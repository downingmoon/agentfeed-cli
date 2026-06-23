import { chmod, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentFeedCredentials } from '../types.js';
import { readJson, writeTextFileAtomic } from '../utils/fs.js';
import type { SecretStore } from './credentials.js';

export type PersistedCredentialStore = 'file' | 'keychain';

export type StoredCredentialRecord = Readonly<Partial<AgentFeedCredentials> & {
  credential_store?: PersistedCredentialStore;
  keychain_service?: string;
  keychain_account?: string;
  credential_store_warning?: string;
}>;

type MutableStoredCredentialRecord = Partial<AgentFeedCredentials> & {
  credential_store?: PersistedCredentialStore;
  keychain_service?: string;
  keychain_account?: string;
  credential_store_warning?: string;
};

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

export async function ensurePrivateAgentFeedDir(): Promise<void> {
  const dir = globalAgentFeedDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700).catch(() => undefined);
}

async function writePrivateJsonFile(value: unknown): Promise<void> {
  await writeTextFileAtomic(credentialsPath(), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await chmod(credentialsPath(), 0o600).catch(() => undefined);
}

export async function writePrivateCredentialsFile(credentials: AgentFeedCredentials, warning?: string): Promise<void> {
  await writePrivateJsonFile({
    ...credentials,
    credential_store: 'file' satisfies PersistedCredentialStore,
    ...(warning ? { credential_store_warning: warning } : {})
  });
}

export async function writeKeychainMetadataFile(credentials: AgentFeedCredentials, store: SecretStore): Promise<void> {
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
  const avatarUrl = optionalStoredStringOrNull(value, 'avatar_url', file, warnings);
  const user: AgentFeedCredentials['user'] = {};
  if (id !== undefined) user.id = id;
  if (username !== undefined) user.username = username;
  if (displayName !== undefined) user.display_name = displayName;
  if (avatarUrl !== undefined) user.avatar_url = avatarUrl;
  return user;
}

function normalizeStoredCredentials(value: unknown, file: string): { readonly credentials: StoredCredentialRecord | null; readonly warnings: readonly string[] } {
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return {
      credentials: null,
      warnings: [`ignored malformed AgentFeed credentials file: ${file}. root must be an object. Run agentfeed login to refresh saved credentials.`]
    };
  }

  const credentials: MutableStoredCredentialRecord = {};
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

export async function readCredentialsFile(file: string): Promise<{ readonly credentials: StoredCredentialRecord | null; readonly warnings: readonly string[] }> {
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

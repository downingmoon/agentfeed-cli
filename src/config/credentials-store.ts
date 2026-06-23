import { rm } from 'node:fs/promises';
import type { AgentFeedCredentials } from '../types.js';
import { pathExists } from '../utils/fs.js';
import { createNativeKeychainStore } from './credentials-keychain.js';
import {
  credentialsPath,
  ensurePrivateAgentFeedDir,
  globalAgentFeedDir,
  readCredentialsFile,
  writeKeychainMetadataFile,
  writePrivateCredentialsFile,
  type StoredCredentialRecord,
} from './credentials-file.js';
import type { CredentialStorePreference, CredentialTokenSource, CredentialsDeleteResult, SecretStore } from './credentials.js';

const INSECURE_CREDENTIAL_STORE_FALLBACK_ENV = 'AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE';

export type CredentialStoreOptions = {
  readonly credentialStore?: CredentialStorePreference;
  readonly secretStore?: SecretStore;
};

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

function nativeKeychainStore(metadata: { readonly keychain_service?: string; readonly keychain_account?: string } = {}): SecretStore {
  return createNativeKeychainStore(globalAgentFeedDir(), metadata);
}

export async function saveCredentialRecord(token: string, credentials: AgentFeedCredentials, options: CredentialStoreOptions): Promise<void> {
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
        return;
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
}

export async function deleteStoredCredentials(options: CredentialStoreOptions): Promise<CredentialsDeleteResult> {
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

export async function tokenFromStoredCredentials(base: StoredCredentialRecord | null, options: CredentialStoreOptions): Promise<{ readonly token: string | null; readonly source: Exclude<CredentialTokenSource, 'environment'>; readonly warnings: readonly string[] }> {
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

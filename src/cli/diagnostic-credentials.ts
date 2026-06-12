import {
  credentialsPath as defaultCredentialsPath,
  loadCredentialsWithMetadata as defaultLoadCredentialsWithMetadata,
  type CredentialsResolution
} from '../config/credentials.js';
import { pathExists as defaultPathExists } from '../utils/fs.js';

export type DiagnosticCredentialsMetadata = {
  readonly metadata: CredentialsResolution;
  readonly invalidApiBaseUrl: boolean;
};

type DiagnosticCredentialsEnvironment = {
  readonly AGENTFEED_TOKEN?: string;
  readonly AGENTFEED_API_BASE_URL?: string;
};

type LoadCredentialsWithMetadata = (options: { readonly cwd?: string }) => Promise<CredentialsResolution>;

export type DiagnosticCredentialsDependencies = {
  readonly loadCredentialsWithMetadata?: LoadCredentialsWithMetadata;
  readonly credentialsPath?: () => string;
  readonly pathExists?: (path: string) => Promise<boolean>;
  readonly env?: DiagnosticCredentialsEnvironment;
};

export type LoadDiagnosticCredentialsOptions = {
  readonly cwd?: string;
  readonly dependencies?: DiagnosticCredentialsDependencies;
};

export function invalidApiBaseUrlMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return error.message.startsWith('Invalid AgentFeed API base URL') ? error.message : null;
}

function invalidConfiguredApiBaseUrlLabel(env: DiagnosticCredentialsEnvironment): string {
  const value = env.AGENTFEED_API_BASE_URL?.trim();
  return value ? `invalid (${value})` : 'invalid';
}

function invalidApiBaseUrlWarnings(message: string): string[] {
  return [
    `invalid AgentFeed API URL setting ignored for diagnostics: ${message}`,
    'Fix AGENTFEED_API_BASE_URL, unset it, or set AGENTFEED_ALLOW_INSECURE_API=1 for explicit development-only HTTP testing.'
  ];
}

function credentialLoadOptions(cwd: string | undefined): { readonly cwd?: string } {
  return cwd === undefined ? {} : { cwd };
}

export async function loadDiagnosticCredentialsWithMetadata(options: LoadDiagnosticCredentialsOptions = {}): Promise<DiagnosticCredentialsMetadata> {
  const dependencies = options.dependencies ?? {};
  const loadCredentialsWithMetadata = dependencies.loadCredentialsWithMetadata ?? defaultLoadCredentialsWithMetadata;
  try {
    return {
      metadata: await loadCredentialsWithMetadata(credentialLoadOptions(options.cwd)),
      invalidApiBaseUrl: false
    };
  } catch (error) {
    const message = invalidApiBaseUrlMessage(error);
    if (!message) throw error;
    const env = dependencies.env ?? process.env;
    const tokenSource = env.AGENTFEED_TOKEN ? 'environment' : 'missing';
    const credentialsPath = dependencies.credentialsPath ?? defaultCredentialsPath;
    const pathExists = dependencies.pathExists ?? defaultPathExists;
    const file = credentialsPath();
    return {
      invalidApiBaseUrl: true,
      metadata: {
        credentials: null,
        token_source: tokenSource,
        credentials_file_path: file,
        credentials_file_exists: await pathExists(file),
        credential_store: tokenSource === 'environment' ? 'environment' : 'missing',
        api_base_url: invalidConfiguredApiBaseUrlLabel(env),
        api_base_url_source: 'environment',
        api_base_url_source_detail: 'AGENTFEED_API_BASE_URL',
        warnings: invalidApiBaseUrlWarnings(message)
      }
    };
  }
}

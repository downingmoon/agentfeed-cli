import type { AgentFeedCredentials } from '../types.js';

export type CredentialResultView = {
  readonly heading: string;
  readonly message: string;
  readonly apiBaseUrl: string;
  readonly tokenExpiresAt: string | null;
  readonly saved: boolean;
  readonly warnings: readonly string[];
  readonly next: readonly string[];
};

export type CredentialJsonView = {
  readonly saved: boolean;
  readonly api_base_url: string;
  readonly token_expires_at: string | null;
  readonly user: AgentFeedCredentials['user'] | null;
  readonly warnings: readonly string[];
  readonly next_actions: readonly string[];
};

type CredentialResultInput = {
  readonly noSave: boolean;
  readonly credentials: AgentFeedCredentials;
  readonly warnings?: readonly string[];
};

type RotateCredentialResultInput = CredentialResultInput & {
  readonly message: string;
};

function tokenExpiresAt(credentials: AgentFeedCredentials): string | null {
  return credentials.token_expires_at ?? null;
}

function savedNextActions(): readonly string[] {
  return ['agentfeed status', 'agentfeed share --dry'];
}

export function browserLoginCredentialResult(options: CredentialResultInput): CredentialResultView {
  return {
    heading: options.noSave ? 'AgentFeed login complete (not saved)' : 'AgentFeed login complete',
    message: options.noSave ? 'AgentFeed browser login complete (not saved).' : 'AgentFeed browser login complete.',
    apiBaseUrl: options.credentials.api_base_url,
    tokenExpiresAt: tokenExpiresAt(options.credentials),
    saved: !options.noSave,
    warnings: options.warnings ?? [],
    next: options.noSave ? ['agentfeed login', 'agentfeed status'] : savedNextActions()
  };
}

export function tokenLoginCredentialResult(options: CredentialResultInput): CredentialResultView {
  return {
    heading: options.noSave ? 'AgentFeed token loaded (not saved)' : 'AgentFeed credentials saved',
    message: options.noSave ? 'AgentFeed token loaded for this command only (not saved).' : 'AgentFeed credentials saved.',
    apiBaseUrl: options.credentials.api_base_url,
    tokenExpiresAt: tokenExpiresAt(options.credentials),
    saved: !options.noSave,
    warnings: options.warnings ?? [],
    next: options.noSave ? ['agentfeed status'] : savedNextActions()
  };
}

export function rotateCredentialResult(options: RotateCredentialResultInput): CredentialResultView {
  return {
    heading: options.noSave ? 'AgentFeed token replacement complete (not saved)' : 'AgentFeed token replacement complete',
    message: options.noSave ? options.message : `${options.message}\nSaved replacement token.`,
    apiBaseUrl: options.credentials.api_base_url,
    tokenExpiresAt: tokenExpiresAt(options.credentials),
    saved: !options.noSave,
    warnings: options.warnings ?? [],
    next: options.noSave ? ['agentfeed status'] : savedNextActions()
  };
}

export function credentialJsonResult(options: {
  readonly saved: boolean;
  readonly credentials: AgentFeedCredentials;
  readonly warnings?: readonly string[];
  readonly next: readonly string[];
}): CredentialJsonView {
  return {
    saved: options.saved,
    api_base_url: options.credentials.api_base_url,
    token_expires_at: tokenExpiresAt(options.credentials),
    user: options.credentials.user ?? null,
    warnings: options.warnings ?? [],
    next_actions: options.next
  };
}

import { describe, expect, it } from 'vitest';
import { renderCredentialResultLines } from '../src/cli/auth-output.js';
import type { CredentialResultView } from '../src/cli/auth-result.js';

const savedResult: CredentialResultView = {
  heading: 'AgentFeed credentials saved',
  message: 'AgentFeed credentials saved.',
  apiBaseUrl: 'https://api.agentfeed.dev/v1',
  tokenExpiresAt: '2026-06-15T00:00:00.000Z',
  saved: true,
  warnings: ['keychain credential storage is not available; saved in private file storage.'],
  next: ['agentfeed status', 'agentfeed share --dry']
};

const noSaveResult: CredentialResultView = {
  heading: 'AgentFeed token loaded (not saved)',
  message: 'AgentFeed token loaded for this command only (not saved).',
  apiBaseUrl: 'http://localhost:8123/v1',
  tokenExpiresAt: null,
  saved: false,
  warnings: [],
  next: ['agentfeed status']
};

const plainStyle = {
  heading: (text: string) => text,
  section: (text: string) => text,
  command: (text: string) => text
} as const;

describe('auth output helpers', () => {
  it('renders saved credential results with summary, warnings, and next actions', () => {
    // Given: a saved credential result view with a token expiry and storage warning.
    const text = renderCredentialResultLines(savedResult, plainStyle).join('\n');

    // Then: the human output preserves the authentication result contract.
    expect(text).toContain('AgentFeed credentials saved');
    expect(text).toContain('AgentFeed credentials saved.');
    expect(text).toContain('Summary');
    expect(text).toContain('Credentials: saved');
    expect(text).toContain('API: https://api.agentfeed.dev/v1');
    expect(text).toContain('Token expires at: 2026-06-15T00:00:00.000Z');
    expect(text).toContain('Warnings');
    expect(text).toContain('Warning: keychain credential storage is not available; saved in private file storage.');
    expect(text).toContain('Next');
    expect(text).toContain('  agentfeed status');
    expect(text).toContain('  agentfeed share --dry');
    expect(text).not.toContain('No credentials file was written.');
  });

  it('renders no-save credential results with explicit persistence guidance', () => {
    // Given: an ephemeral credential result view.
    const text = renderCredentialResultLines(noSaveResult, plainStyle).join('\n');

    // Then: the output warns that future commands still need a token source.
    expect(text).toContain('AgentFeed token loaded (not saved)');
    expect(text).toContain('AgentFeed token loaded for this command only (not saved).');
    expect(text).toContain('Credentials: not saved');
    expect(text).toContain('API: http://localhost:8123/v1');
    expect(text).toContain('No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.');
    expect(text).toContain('  agentfeed status');
    expect(text).not.toContain('Warnings');
    expect(text).not.toContain('Token expires at:');
  });
});

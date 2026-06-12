import { describe, expect, it } from 'vitest';
import type { CredentialsDeleteResult } from '../src/config/credentials.js';
import { logoutJsonPayload, renderLogoutHumanLines } from '../src/cli/logout-output.js';

const removedWithKeychainWarning = {
  credentials_file_path: '/tmp/home/.agentfeed/credentials.json',
  credentials_file_deleted: true,
  keychain_deleted: false,
  warnings: ['keychain warning']
} satisfies CredentialsDeleteResult;

const missingCredentials = {
  credentials_file_path: '/tmp/home/.agentfeed/credentials.json',
  credentials_file_deleted: false,
  keychain_deleted: null,
  warnings: []
} satisfies CredentialsDeleteResult;

describe('logout output helpers', () => {
  it('builds logout JSON payload with environment-token warning and security checklist', () => {
    // Given: saved credentials were removed but the shell still has AGENTFEED_TOKEN.
    const payload = logoutJsonPayload({ result: removedWithKeychainWarning, envTokenActive: true });

    // Then: the JSON contract reports deletion state, warnings, checklist, and next actions.
    expect(payload).toMatchObject({
      credentials_file_deleted: true,
      credentials_file_path: '/tmp/home/.agentfeed/credentials.json',
      keychain_deleted: false,
      environment_token_active: true,
      next_actions: ['agentfeed status']
    });
    expect(payload.warnings).toEqual([
      'keychain warning',
      'AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.'
    ]);
    expect(payload.security_checklist).toEqual([
      { name: 'Saved credentials', status: 'done', detail: 'removed from this machine' },
      { name: 'OS keychain token', status: 'attention', detail: 'not removed', next_action: 'agentfeed logout' },
      { name: 'Environment token', status: 'attention', detail: 'AGENTFEED_TOKEN is still active in this shell', next_action: 'unset AGENTFEED_TOKEN' }
    ]);
  });

  it('renders logout human lines with warnings, security checklist, and next action', () => {
    // Given: logout removed the credentials file but could not remove the keychain token.
    const lines = renderLogoutHumanLines({ result: removedWithKeychainWarning, envTokenActive: true });
    const text = lines.join('\n');

    // Then: the human report keeps summary, warnings, checklist, and follow-up visible.
    expect(text).toContain('AgentFeed logout complete');
    expect(text).toContain('AgentFeed saved credentials removed.');
    expect(text).toContain('Summary');
    expect(text).toContain('Credentials file: removed');
    expect(text).toContain('OS keychain token: not removed');
    expect(text).toContain('Warnings');
    expect(text).toContain('Warning: keychain warning');
    expect(text).toContain('Warning: AGENTFEED_TOKEN is still set in this shell');
    expect(text).toContain('Security checklist');
    expect(text).toContain('Saved credentials: removed from this machine');
    expect(text).toContain('OS keychain token: not removed → agentfeed logout');
    expect(text).toContain('Environment token: AGENTFEED_TOKEN is still active in this shell → unset AGENTFEED_TOKEN');
    expect(text).toContain('Next');
    expect(text).toContain('agentfeed status');
  });

  it('renders logout human lines without warnings when no stored credentials or environment token exist', () => {
    // Given: logout found no saved credentials and no active environment token.
    const lines = renderLogoutHumanLines({ result: missingCredentials, envTokenActive: false });
    const text = lines.join('\n');

    // Then: the report avoids a warning section and still explains the clean state.
    expect(text).toContain('No saved AgentFeed credentials were found.');
    expect(text).toContain('Credentials file: not found');
    expect(text).toContain('Environment token: not set in this shell');
    expect(text).not.toContain('Warnings');
  });
});

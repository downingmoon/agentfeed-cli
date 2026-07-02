import { describe, expect, it } from 'vitest';
import type { StatusReadinessItem } from '../src/cli/status-readiness.js';
import { renderStatusHumanLines, statusJsonPayload } from '../src/cli/status-output.js';

const readiness: readonly StatusReadinessItem[] = [
  { name: 'API', status: 'ready', detail: 'base URL accepted' },
  { name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' }
];

const baseStatusInput = {
  health: 'attention needed',
  readiness,
  hasToken: false,
  tokenSource: 'missing',
  credentialStore: 'missing',
  credentialsFileExists: false,
  credentialsFilePath: '/tmp/home/.agentfeed/credentials.json',
  tokenExpiresAt: null,
  apiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1',
  apiBaseUrlSource: 'default',
  apiBaseUrlSourceDetail: undefined,
  invalidApiBaseUrl: false,
  projectInitialized: true,
  projectName: 'agentfeed-cli',
  projectRoot: '/repo/agentfeed-cli',
  projectConfigError: null,
  insideGitRepository: true,
  claudeCodeHook: 'installed',
  localDraftsCount: 2,
  pendingUploadCount: 1,
  lastCollectionCursor: '2026-06-12T01:02:03.000Z',
  warnings: ['pending local drafts exist while a collection cursor is set; publish/discard them or use --all/--since if the next collect looks empty.'],
  nextActions: ['agentfeed publish --latest --yes', 'agentfeed discard --latest']
} as const;

describe('status output helpers', () => {
  it('renders status JSON payload with labels and collection cursor text', () => {
    // Given: a status command model with pending uploads and a collection cursor.
    const payload = statusJsonPayload(baseStatusInput);

    // Then: the JSON contract preserves account, API, project, collection, and next action labels.
    expect(payload.account).toMatchObject({
      token_configured: false,
      token_source: 'missing',
      token_source_label: 'missing',
      credential_store: 'missing',
      credential_store_label: 'missing',
      token_expires_at: null
    });
    expect(payload.api).toMatchObject({
      base_url: 'https://agentfeed.api.downingmoon.dev/v1',
      source: 'default',
      source_label: 'default',
      invalid: false
    });
    expect(payload.project).toMatchObject({
      initialized: true,
      name: 'agentfeed-cli',
      root: '/repo/agentfeed-cli',
      git_repository: true,
      claude_code_hook: 'installed'
    });
    expect(payload.collection).toMatchObject({
      local_drafts_count: 2,
      pending_upload_count: 1,
      last_collection_cursor: '2026-06-12T01:02:03.000Z',
      last_collection_cursor_label: '2026-06-12T01:02:03.000Z',
      next_default_collection_since: '2026-06-12T01:02:03.000Z',
      next_default_collection_since_label: '2026-06-12T01:02:03.000Z'
    });
    expect(payload.next_actions).toEqual(['agentfeed publish --latest --yes', 'agentfeed discard --latest']);
  });

  it('renders status human lines with readiness, warnings, project, collection, and next commands', () => {
    // Given: the same status command model for human-readable output.
    const lines = renderStatusHumanLines(baseStatusInput);
    const text = lines.join('\n');

    // Then: the visible report keeps all operational sections and guidance together.
    expect(text).toContain('AgentFeed status');
    expect(text).toContain('Health: attention needed');
    expect(text).toContain('API: base URL accepted');
    expect(text).toContain('Account: token missing');
    expect(text).toContain('User/token: missing');
    expect(text).toContain('User/token source: missing');
    expect(text).toContain('Credential store: missing');
    expect(text).toContain('API base URL: https://agentfeed.api.downingmoon.dev/v1');
    expect(text).toContain('Project initialized: yes');
    expect(text).toContain('Project name: agentfeed-cli');
    expect(text).toContain('Claude Code hook: installed');
    expect(text).toContain('Local drafts count: 2');
    expect(text).toContain('Pending upload count: 1');
    expect(text).toContain('Last collection cursor: 2026-06-12T01:02:03.000Z');
    expect(text).toContain('Warning: pending local drafts exist while a collection cursor is set');
    expect(text).toContain('Recommended order:');
    expect(text).toContain('1. agentfeed publish --latest --yes');
    expect(text).toContain('2. agentfeed discard --latest');
  });
});

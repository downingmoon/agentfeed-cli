import { describe, expect, it } from 'vitest';
import { runShareCollectionCommand } from '../src/cli/share-collection-execution.js';
import { createEmptyDraft, type CollectDraftOptions } from '../src/draft/create.js';
import type { AgentFeedCredentials, AgentType, CollectionWindow, LocalDraft } from '../src/types.js';

const credentials: AgentFeedCredentials = {
  api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
  ingestion_token: 'af_live_share_collection_execution',
  created_at: '2026-06-12T00:00:00.000Z'
};

function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-share-collection-execution', source: 'codex' });
  draft.id = id;
  draft.source.created_at = '2026-06-12T01:30:00.000Z';
  draft.source.collection_window = { since: '2026-06-12T00:00:00.000Z', until: '2026-06-12T01:00:00.000Z' };
  draft.worklog.title = 'Share collection execution contract';
  return draft;
}

function defaultShareOptions() {
  return {
    source: 'codex' as AgentType,
    sessionFile: 'codex-session.jsonl',
    dryRun: false,
    note: null,
    runConfiguredCommands: false
  } as const;
}

describe('share collection execution', () => {
  it('collects and sanitizes dry-run shares without loading upload credentials', async () => {
    // Given: share dry-run has an explicit session file and cursor warning.
    const draft = draftWithId('draft_share_collection_dry_execution');
    const sanitizedDraft = draftWithId('draft_share_collection_dry_execution');
    const collectionWindow: CollectionWindow = { since: '2026-06-12T00:00:00.000Z', until: '2026-06-12T01:00:00.000Z' };
    const collectCalls: CollectDraftOptions[] = [];
    let configLoaded = false;
    let credentialsLoaded = false;
    const sanitizedDraftIds: string[] = [];

    // When: share collection preparation runs for a dry-run request.
    const result = await runShareCollectionCommand({
      cwd: '/tmp/agentfeed-share-collection-execution',
      args: ['--dry', '--all'],
      share: { ...defaultShareOptions(), dryRun: true, note: 'public note', runConfiguredCommands: true },
      dependencies: {
        loadProjectConfig: async () => {
          configLoaded = true;
        },
        resolveCollectionWindowWithDiagnostics: async () => ({
          window: collectionWindow,
          warnings: ['cursor warning'],
          collection_state: { state: {}, path: '/tmp/state.json', warnings: ['cursor warning'], valid: false }
        }),
        loadCredentials: async () => {
          credentialsLoaded = true;
          return credentials;
        },
        collectDraftWithStatus: async (options) => {
          collectCalls.push(options);
          return { draft, reusedExisting: true, warnings: ['collection warning'] };
        },
        sanitizeDraftForOutput: async (_cwd, nextDraft) => {
          sanitizedDraftIds.push(nextDraft.id);
          return sanitizedDraft;
        }
      }
    });

    // Then: dry-run collection preserves current collection flags and skips credential loading.
    expect(result).toEqual({
      draft: sanitizedDraft,
      credentials: null,
      reusedExistingDraft: true,
      warnings: ['cursor warning', 'collection warning']
    });
    expect(configLoaded).toBe(true);
    expect(credentialsLoaded).toBe(false);
    expect(collectCalls).toEqual([{
      cwd: '/tmp/agentfeed-share-collection-execution',
      source: 'codex',
      sessionFile: 'codex-session.jsonl',
      since: '2026-06-12T00:00:00.000Z',
      until: '2026-06-12T01:00:00.000Z',
      force: true,
      inferIdleGap: false,
      note: 'public note',
      runConfiguredCommands: true,
      skipConfiguredCommands: true
    }]);
    expect(sanitizedDraftIds).toEqual(['draft_share_collection_dry_execution']);
  });

  it('loads credentials for uploadable share collection and preserves force/run-command options', async () => {
    // Given: share upload preparation has credentials and explicit --force.
    const draft = draftWithId('draft_share_collection_upload_execution');
    const collectionWindow: CollectionWindow = { since: null, until: '2026-06-12T02:00:00.000Z' };
    const collectCalls: CollectDraftOptions[] = [];

    // When: share collection preparation runs for an upload-capable request.
    const result = await runShareCollectionCommand({
      cwd: '/tmp/agentfeed-share-collection-execution',
      args: ['--force'],
      share: { ...defaultShareOptions(), sessionFile: null, runConfiguredCommands: true },
      dependencies: {
        loadProjectConfig: async () => undefined,
        resolveCollectionWindowWithDiagnostics: async () => ({
          window: collectionWindow,
          warnings: [],
          collection_state: { state: {}, path: '/tmp/state.json', warnings: [], valid: true }
        }),
        loadCredentials: async () => credentials,
        collectDraftWithStatus: async (options) => {
          collectCalls.push(options);
          return { draft, reusedExisting: false, warnings: [] };
        },
        sanitizeDraftForOutput: async (_cwd, nextDraft) => nextDraft
      }
    });

    // Then: uploadable share collection loads credentials and keeps configured-command collection enabled.
    expect(result).toEqual({
      draft,
      credentials,
      reusedExistingDraft: false,
      warnings: []
    });
    expect(collectCalls).toEqual([{
      cwd: '/tmp/agentfeed-share-collection-execution',
      source: 'codex',
      sessionFile: null,
      since: null,
      until: '2026-06-12T02:00:00.000Z',
      force: true,
      inferIdleGap: true,
      note: null,
      runConfiguredCommands: true,
      skipConfiguredCommands: false
    }]);
  });
});

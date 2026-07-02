import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/config/defaults.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { AgentFeedCredentials } from '../src/types.js';
import { runCollectCliCommand } from '../src/cli/collect-command.js';

function draftWithId(id: string) {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-collect-command', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Collect command wrapper contract';
  return draft;
}

const projectConfig = defaultProjectConfig({ name: 'proj', slug: 'proj' });

const credentials: AgentFeedCredentials = {
  api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
  ingestion_token: 'af_test_collect_command',
  created_at: '2026-06-21T00:00:00.000Z'
};

describe('collect command wrapper', () => {
  it('prints JSON output and marks collection cursor', async () => {
    // Given: collection succeeds with no upload requested.
    const draft = draftWithId('draft_collect_command_json');
    const printed: string[] = [];
    const marked: string[] = [];

    // When: collect runs in JSON mode.
    await runCollectCliCommand(['--json'], {
      cwd: '/tmp/agentfeed-collect-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      publish: async () => undefined,
      dependencies: {
        loadProjectConfig: async () => ({ ...projectConfig, collection: { ...projectConfig.collection, auto_upload: false } }),
        resolveCollectionWindowWithDiagnostics: async () => ({ window: { since: null, until: null }, warnings: ['window warning'] }),
        loadCredentials: async () => null,
        collectDraftWithStatus: async () => ({ draft, reusedExisting: false, warnings: ['collect warning'] }),
        sanitizeDraftForOutput: async (_cwd, value) => value,
        markCollectionComplete: async (_cwd, _window, createdAt) => { marked.push(createdAt.toISOString()); }
      }
    });

    // Then: stdout is a single collect JSON payload and cursor persistence ran.
    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      id: 'draft_collect_command_json',
      warnings: ['window warning', 'collect warning']
    });
    expect(marked).toEqual([draft.source.created_at]);
  });

  it('delegates human upload to publish after rendering the collected draft', async () => {
    // Given: upload is requested and credentials are available.
    const draft = draftWithId('draft_collect_command_upload');
    const printed: string[] = [];
    const publishArgs: string[][] = [];

    // When: collect runs in human upload mode with --open-review.
    await runCollectCliCommand(['--upload', '--open-review'], {
      cwd: '/tmp/agentfeed-collect-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      publish: async (args) => { publishArgs.push(args); },
      dependencies: {
        loadProjectConfig: async () => ({ ...projectConfig, collection: { ...projectConfig.collection, auto_upload: false } }),
        resolveCollectionWindowWithDiagnostics: async () => ({ window: { since: null, until: null }, warnings: [] }),
        loadCredentials: async () => credentials,
        collectDraftWithStatus: async () => ({ draft, reusedExisting: false, warnings: [] }),
        sanitizeDraftForOutput: async (_cwd, value) => value,
        markCollectionComplete: async () => undefined
      }
    });

    // Then: the collected draft summary is printed and upload delegates to publish with the collected id.
    expect(printed.join('\n')).toContain('AgentFeed draft ready');
    expect(publishArgs).toEqual([['--id', 'draft_collect_command_upload', '--yes', '--open-review']]);
  });

  it('fails before collection when upload is requested without credentials', async () => {
    // Given: upload is requested but no credentials exist.
    const collected: string[] = [];

    // When / Then: collect rejects before creating a draft.
    await expect(runCollectCliCommand(['--upload'], {
      cwd: '/tmp/agentfeed-collect-command',
      print: () => undefined,
      printLines: () => undefined,
      publish: async () => undefined,
      dependencies: {
        loadProjectConfig: async () => ({ ...projectConfig, collection: { ...projectConfig.collection, auto_upload: false } }),
        resolveCollectionWindowWithDiagnostics: async () => ({ window: { since: null, until: null }, warnings: [] }),
        loadCredentials: async () => null,
        collectDraftWithStatus: async () => {
          collected.push('called');
          return { draft: draftWithId('draft_unreachable'), reusedExisting: false, warnings: [] };
        }
      }
    })).rejects.toThrow('AgentFeed token is missing.');
    expect(collected).toEqual([]);
  });
});

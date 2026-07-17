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

  it('delegates human upload to terminal-reviewed publish after rendering the collected draft', async () => {
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

    // Then: the collected draft summary is printed and upload delegates to publish without bypassing review.
    expect(printed.join('\n')).toContain('AgentFeed draft ready');
    expect(publishArgs).toEqual([['--id', 'draft_collect_command_upload', '--open-review']]);
  });

  it('passes explicit yes through collect upload for one-command upload automation', async () => {
    // Given: upload is requested with explicit confirmation bypass.
    const draft = draftWithId('draft_collect_command_upload_yes');
    const publishArgs: string[][] = [];

    // When: collect runs with --upload --yes.
    await runCollectCliCommand(['--upload', '--yes'], {
      cwd: '/tmp/agentfeed-collect-command',
      print: () => undefined,
      printLines: () => undefined,
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

    // Then: the delegated publish command receives --yes only when explicitly requested.
    expect(publishArgs).toEqual([['--id', 'draft_collect_command_upload_yes', '--yes']]);
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

  it('keeps idle-gap inference for --force but disables it for --all', async () => {
    // Given: the wrapper delegates to the draft collector.
    const inferIdleGapValues: Array<boolean | undefined> = [];

    // When: force recollection and all recollection run through the command wrapper.
    for (const args of [['--force'], ['--all']]) {
      await runCollectCliCommand(args, {
        cwd: '/tmp/agentfeed-collect-command',
        print: () => undefined,
        printLines: () => undefined,
        publish: async () => undefined,
        dependencies: {
          loadProjectConfig: async () => ({ ...projectConfig, collection: { ...projectConfig.collection, auto_upload: false } }),
          resolveCollectionWindowWithDiagnostics: async () => ({ window: { since: null, until: '2026-05-20T05:00:00.000Z' }, warnings: [] }),
          loadCredentials: async () => null,
          collectDraftWithStatus: async (options) => {
            inferIdleGapValues.push(options.inferIdleGap);
            return { draft: draftWithId(`draft_${args[0].slice(2)}`), reusedExisting: false, warnings: [] };
          },
          sanitizeDraftForOutput: async (_cwd, value) => value,
          markCollectionComplete: async () => undefined
        }
      });
    }

    // Then: --force still lets long Codex sessions be split by idle gap, while --all preserves full-session intent.
    expect(inferIdleGapValues).toEqual([true, false]);
  });
});

describe('collect command local AI worklog flow', () => {
  it('improves the draft before terminal-reviewed upload when explicitly requested', async () => {
    // Given: upload is requested with the local AI worklog flag.
    const draft = draftWithId('draft_collect_ai_before_upload');
    const improved = draftWithId('draft_collect_ai_improved');
    improved.worklog.title = 'AI improved worklog';
    const publishArgs: string[][] = [];

    // When: collect runs before publish.
    await runCollectCliCommand(['--upload', '--ai-worklog'], {
      cwd: '/tmp/agentfeed-collect-command',
      print: () => undefined,
      printLines: () => undefined,
      publish: async (args) => { publishArgs.push(args); },
      interactive: false,
      dependencies: {
        loadProjectConfig: async () => ({ ...projectConfig, collection: { ...projectConfig.collection, auto_upload: false } }),
        resolveCollectionWindowWithDiagnostics: async () => ({ window: { since: null, until: null }, warnings: [] }),
        loadCredentials: async () => credentials,
        collectDraftWithStatus: async () => ({ draft, reusedExisting: false, warnings: [] }),
        sanitizeDraftForOutput: async (_cwd, value) => value,
        runLocalAiWorklogFlow: async () => ({ draft: improved, warnings: [] }),
        markCollectionComplete: async () => undefined
      }
    });

    // Then: publish receives the improved draft id and still controls upload confirmation.
    expect(publishArgs).toEqual([['--id', 'draft_collect_ai_improved']]);
  });

  it('skips local AI worklog flow in JSON mode', async () => {
    // Given: JSON upload is requested with AI flags.
    const draft = draftWithId('draft_collect_ai_json_skip');
    let aiCalls = 0;

    // When: collect runs in JSON mode.
    await runCollectCliCommand(['--json', '--upload', '--ai-worklog'], {
      cwd: '/tmp/agentfeed-collect-command',
      print: () => undefined,
      printLines: () => undefined,
      publish: async () => undefined,
      interactive: false,
      dependencies: {
        loadProjectConfig: async () => ({ ...projectConfig, collection: { ...projectConfig.collection, auto_upload: false } }),
        resolveCollectionWindowWithDiagnostics: async () => ({ window: { since: null, until: null }, warnings: [] }),
        loadCredentials: async () => credentials,
        collectDraftWithStatus: async () => ({ draft, reusedExisting: false, warnings: [] }),
        sanitizeDraftForOutput: async (_cwd, value) => value,
        runCollectJsonUploadCommand: async (input) => input.draft,
        runLocalAiWorklogFlow: async () => {
          aiCalls += 1;
          return { draft, warnings: [] };
        },
        markCollectionComplete: async () => undefined
      }
    });

    // Then: machine-readable JSON output remains unaffected by AI prompting.
    expect(aiCalls).toBe(0);
  });
});

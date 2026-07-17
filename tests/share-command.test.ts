import { describe, expect, it } from 'vitest';
import type { PublishDraftResult } from '../src/api/client.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../src/types.js';
import { runShareCliCommand } from '../src/cli/share-command.js';

function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-share-command', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Share command wrapper contract';
  return draft;
}

const credentials: AgentFeedCredentials = {
  api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
  ingestion_token: 'af_test_share_command',
  created_at: '2026-06-21T00:00:00.000Z'
};

const upload: PublishDraftResult = {
  id: 'worklog_share_command',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_share_command/review',
  review_base_url: 'https://agentfeed.downingmoon.dev',
  created_at: '2026-06-21T00:00:00.000Z'
};

const handoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

describe('share command wrapper', () => {
  it('prints local JSON output when upload is skipped without credentials', async () => {
    // Given: share collection succeeds but no credentials are available.
    const draft = draftWithId('draft_share_command_local');
    const printed: string[] = [];

    // When: the share CLI command wrapper runs in JSON mode.
    await runShareCliCommand(['--json'], {
      cwd: '/tmp/agentfeed-share-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        runShareCollectionCommand: async () => ({
          draft,
          credentials: null,
          reusedExistingDraft: false,
          warnings: ['collection warning']
        }),
        loadCredentialsWithMetadata: async () => ({
          credentials: null,
          token_source: 'missing',
          credentials_file_path: '/tmp/agentfeed-share-command/credentials.json',
          credentials_file_exists: false,
          credential_store: 'missing',
          warnings: []
        })
      }
    });

    // Then: stdout is a single machine-readable local share payload.
    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      dry_run: false,
      upload_skipped: { reason: 'token_missing', next_action: 'agentfeed login' },
      draft: { id: 'draft_share_command_local' },
      warnings: ['collection warning']
    });
  });

  it('prints uploaded JSON output when share upload completes', async () => {
    // Given: share collection returns credentials and upload execution succeeds.
    const draft = draftWithId('draft_share_command_uploaded');
    const printed: string[] = [];

    // When: the share CLI command wrapper uploads in JSON mode.
    await runShareCliCommand(['--json', '--yes', '--no-open-review', '--no-clipboard'], {
      cwd: '/tmp/agentfeed-share-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        runShareCollectionCommand: async () => ({ draft, credentials, reusedExistingDraft: true, warnings: [] }),
        runShareUploadCommand: async () => ({ kind: 'uploaded', draft, upload, handoff })
      }
    });

    // Then: stdout is a single machine-readable uploaded share payload.
    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      dry_run: false,
      reused_existing_draft: true,
      draft_id: 'draft_share_command_uploaded',
      upload: { id: 'worklog_share_command' },
      handoff
    });
  });

  it('uploads after terminal confirmation when share upload pauses', async () => {
    // Given: share collection returns credentials and the terminal prompt accepts upload.
    const draft = draftWithId('draft_share_command_prompt');
    const printed: string[] = [];
    const yesValues: boolean[] = [];

    // When: the share CLI command wrapper runs in an interactive terminal.
    await runShareCliCommand([], {
      cwd: '/tmp/agentfeed-share-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      interactive: true,
      prompt: async () => 'y',
      dependencies: {
        runShareCollectionCommand: async () => ({ draft, credentials, reusedExistingDraft: false, warnings: [] }),
        runShareUploadCommand: async (options) => {
          yesValues.push(options.flags.yes);
          if (!options.flags.yes) {
            return {
              kind: 'confirmation_required',
              draft,
              command: 'agentfeed publish --id draft_share_command_prompt --yes',
              extraCommand: 'agentfeed share --yes'
            };
          }
          return { kind: 'uploaded', draft, upload, handoff };
        }
      }
    });

    // Then: share shows the terminal review, then uploads in the same command after confirmation.
    const output = printed.join('\n');
    expect(yesValues).toEqual([false, true]);
    expect(output).toContain('AgentFeed share preview');
    expect(output).toContain('Upload confirmation required.');
    expect(output).toContain('AgentFeed upload complete');
  });


  it('forwards the terminal prompt into share collection so local AI selection can affect upload', async () => {
    // Given: share runs through the real wrapper and the injected prompt opts into local AI worklog generation.
    const draft = draftWithId('draft_share_command_ai_prompt');
    const prompts: string[] = [];
    const uploadedTitles: string[] = [];

    // When: the wrapper starts collection and upload in one interactive command.
    await runShareCliCommand(['--yes', '--no-open-review'], {
      cwd: '/tmp/agentfeed-share-command',
      print: () => undefined,
      printLines: () => undefined,
      interactive: true,
      prompt: async (question) => {
        prompts.push(question);
        return 'y';
      },
      dependencies: {
        runShareCollectionCommand: async (options) => {
          const answer = await options.prompt?.('Use a local AI CLI to improve this worklog before upload? [y/N] ');
          const nextDraft = answer === 'y' ? { ...draft, worklog: { ...draft.worklog, title: 'AI generated share title' } } : draft;
          return { draft: nextDraft, credentials, reusedExistingDraft: false, warnings: [] };
        },
        runShareUploadCommand: async (options) => {
          uploadedTitles.push(options.draft.worklog.title);
          return { kind: 'uploaded', draft: options.draft, upload, handoff };
        }
      }
    });

    // Then: the same prompt seam reaches collection and the AI-improved draft is uploaded.
    expect(prompts).toEqual(['Use a local AI CLI to improve this worklog before upload? [y/N] ']);
    expect(uploadedTitles).toEqual(['AI generated share title']);
  });

  it('prints human confirmation guidance when upload pauses', async () => {
    // Given: share collection returns credentials but upload execution requires confirmation.
    const draft = draftWithId('draft_share_command_confirm');
    const printed: string[] = [];

    // When: the share CLI command wrapper runs in human mode without confirmation.
    await runShareCliCommand([], {
      cwd: '/tmp/agentfeed-share-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        runShareCollectionCommand: async () => ({ draft, credentials, reusedExistingDraft: false, warnings: [] }),
        runShareUploadCommand: async () => ({
          kind: 'confirmation_required',
          draft,
          command: 'agentfeed publish --id draft_share_command_confirm --yes',
          extraCommand: 'agentfeed share --yes'
        })
      }
    });

    // Then: preview plus confirmation guidance is printed.
    const output = printed.join('\n');
    expect(output).toContain('AgentFeed share preview');
    expect(output).toContain('agentfeed publish --id draft_share_command_confirm --yes');
    expect(output).toContain('agentfeed share --yes');
  });
});

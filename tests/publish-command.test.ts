import { describe, expect, it } from 'vitest';
import type { PublishDraftResult } from '../src/api/client.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { LocalDraft, ReviewUrlHandoff } from '../src/types.js';
import { runPublishCliCommand } from '../src/cli/publish-command.js';

const upload: PublishDraftResult = {
  id: 'worklog_publish_command',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_publish_command/review',
  review_base_url: 'https://agentfeed.downingmoon.dev',
  created_at: '2026-06-21T00:00:00.000Z'
};

const handoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-publish-command', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Publish command wrapper contract';
  return draft;
}

describe('publish command wrapper', () => {
  it('prints JSON publish payload through the CLI surface', async () => {
    // Given: publish execution returns a completed upload and the operator requested JSON.
    const draft = draftWithId('draft_publish_command_json');
    const printed: string[] = [];

    // When: the publish CLI command wrapper runs.
    await runPublishCliCommand(['--id', draft.id, '--json'], {
      cwd: '/tmp/agentfeed-publish-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      resolveDraftId: async () => draft.id,
      runPublishCommand: async () => ({ kind: 'published', draft, upload, handoff })
    });

    // Then: stdout remains a machine-readable publish contract.
    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      draft_id: 'draft_publish_command_json',
      upload: { id: 'worklog_publish_command' },
      handoff,
      next_actions: [
        'agentfeed open --id draft_publish_command_json',
        'agentfeed preview --id draft_publish_command_json'
      ]
    });
  });

  it('uploads after terminal confirmation when publish pauses', async () => {
    // Given: the first publish execution requires confirmation and the terminal prompt accepts it.
    const draft = draftWithId('draft_publish_command_prompt');
    const printed: string[] = [];
    const yesValues: boolean[] = [];

    // When: the publish CLI command wrapper runs in an interactive terminal.
    await runPublishCliCommand(['--id', draft.id], {
      cwd: '/tmp/agentfeed-publish-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      resolveDraftId: async () => draft.id,
      interactive: true,
      prompt: async () => 'yes',
      runPublishCommand: async (options) => {
        yesValues.push(options.flags.yes);
        if (!options.flags.yes) {
          return {
            kind: 'confirmation_required',
            draft,
            command: 'agentfeed publish --id draft_publish_command_prompt --yes'
          };
        }
        return { kind: 'published', draft, upload, handoff };
      }
    });

    // Then: the preview is shown first, then the confirmed upload result is printed.
    const output = printed.join('\n');
    expect(yesValues).toEqual([false, true]);
    expect(output).toContain('Upload confirmation required.');
    expect(output).toContain('AgentFeed upload complete');
  });

  it('prints confirmation guidance without uploading when publish pauses', async () => {
    // Given: publish execution returns a confirmation-required result.
    const draft = draftWithId('draft_publish_command_confirm');
    const printed: string[] = [];

    // When: the publish CLI command wrapper runs without --yes.
    await runPublishCliCommand(['--id', draft.id], {
      cwd: '/tmp/agentfeed-publish-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      resolveDraftId: async () => draft.id,
      runPublishCommand: async () => ({
        kind: 'confirmation_required',
        draft,
        command: 'agentfeed publish --id draft_publish_command_confirm --yes',
        cacheReuseReason: 'payload_hash_mismatch'
      })
    });

    // Then: the operator sees the retry command and no JSON payload is printed.
    const output = printed.join('\n');
    expect(output).toContain('agentfeed publish --id draft_publish_command_confirm --yes');
    expect(output).toContain('local draft content changed after the saved upload');
    expect(() => JSON.parse(output)).toThrow();
  });
});

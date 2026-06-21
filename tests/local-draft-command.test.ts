import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import type { LocalDraft } from '../src/types.js';
import { runDiscardCliCommand, runDraftsCliCommand, runOpenCliCommand } from '../src/cli/local-draft-command.js';

function draftWithReview(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-local-draft-command', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Local draft command wrapper contract';
  draft.upload.uploaded = true;
  draft.upload.review_url = `https://agentfeed.dev/worklogs/${id}/review`;
  draft.upload.review_base_url = 'https://agentfeed.dev';
  return draft;
}

describe('local draft command wrappers', () => {
  it('prints machine-readable draft list output', async () => {
    // Given: a project with one local draft row.
    const printed: string[] = [];

    // When: the drafts CLI command wrapper runs in JSON mode.
    await runDraftsCliCommand(['--json'], {
      cwd: '/tmp/agentfeed-local-draft-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        loadProjectConfig: async () => undefined,
        listDrafts: async () => [{ id: 'draft_local_list', path: '/tmp/draft_local_list.json', mtimeMs: 1 }],
        buildDraftListRow: async () => ({
          id: 'draft_local_list',
          path: '/tmp/draft_local_list.json',
          updated_at: '2026-06-21T00:00:00.000Z',
          valid: true,
          project: 'proj',
          title: 'Draft list wrapper',
          agent: 'codex',
          status: 'pending',
          privacy: 'passed',
          findings: 0,
          metrics: 'files 1, lines +1/-0',
          review_url: null
        })
      }
    });

    // Then: stdout is a single draft list JSON payload.
    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      summary: { total: 1, pending: 1, uploaded: 0, invalid: 0 },
      drafts: [{ id: 'draft_local_list', status: 'pending' }]
    });
  });

  it('prints discard confirmation without deleting local files', async () => {
    // Given: a draft with both saved artifacts present.
    const printed: string[] = [];
    const removed: string[] = [];

    // When: the discard CLI command wrapper runs without --yes.
    await runDiscardCliCommand(['--id', 'draft_keep'], {
      cwd: '/tmp/agentfeed-local-draft-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      resolveDraftId: async () => 'draft_keep',
      dependencies: {
        resolveProjectRoot: async () => '/tmp/agentfeed-local-draft-command',
        pathExists: async () => true,
        removeFile: async (path) => { removed.push(path); }
      }
    });

    // Then: confirmation guidance is printed and no artifact is removed.
    expect(printed.join('\n')).toContain('AgentFeed discard paused');
    expect(printed.join('\n')).toContain('agentfeed discard --id draft_keep --yes');
    expect(removed).toEqual([]);
  });

  it('prints machine-readable open output', async () => {
    // Given: an uploaded draft resolves to an open review result.
    const draft = draftWithReview('draft_open_local_command');
    const printed: string[] = [];

    // When: the open CLI command wrapper runs in JSON mode.
    await runOpenCliCommand(['--id', draft.id, '--json'], {
      cwd: '/tmp/agentfeed-local-draft-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        resolveOpenDraft: async () => draft,
        openReviewDraft: async () => ({
          draftId: draft.id,
          reviewUrl: draft.upload.review_url ?? '',
          opened: false,
          warnings: [],
          jsonWarnings: ['Review URL could not be opened automatically. Open review_url manually.']
        })
      }
    });

    // Then: stdout is a single open JSON payload with JSON-specific warning details.
    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      draft_id: 'draft_open_local_command',
      opened: false,
      warnings: ['Review URL could not be opened automatically. Open review_url manually.']
    });
  });
});

import { describe, expect, it } from 'vitest';
import { draftListJsonOutput, draftListSummary, renderDraftListHumanLines, type DraftListRow } from '../src/cli/draft-list-output.js';

const pendingRow: DraftListRow = {
  id: 'draft_pending',
  path: '/tmp/.agentfeed/drafts/draft_pending.json',
  updated_at: '2026-06-12T03:00:00.000Z',
  valid: true,
  project: 'proj',
  title: 'Pending draft',
  agent: 'codex',
  status: 'pending',
  privacy: 'safe',
  findings: 0,
  metrics: '2 files · +42 -7',
  review_url: null
};

const invalidRow: DraftListRow = {
  id: 'draft_broken',
  path: '/tmp/.agentfeed/drafts/draft_broken.json',
  updated_at: '2026-06-12T02:00:00.000Z',
  valid: false,
  error: 'Unexpected token in JSON'
};

describe('draft list output helpers', () => {
  it('summarizes mixed valid and invalid drafts', () => {
    // Given: one pending draft and one invalid draft file.
    const rows = [pendingRow, invalidRow];

    // When: the draft list summary is calculated.
    const summary = draftListSummary(rows);

    // Then: counts reflect total, valid, invalid, and upload state.
    expect(summary).toEqual({ total: 2, valid: 1, invalid: 1, pending: 1, uploaded: 0 });
  });

  it('builds machine-readable draft list output with next actions', () => {
    // Given: a pending draft row ready for JSON output.
    const rows = [pendingRow];

    // When: the JSON payload is assembled.
    const output = draftListJsonOutput(rows);

    // Then: it stays machine-readable and points to preview/publish actions.
    expect(output).toMatchObject({
      summary: { total: 1, valid: 1, invalid: 0, pending: 1, uploaded: 0 },
      drafts: rows,
      next_actions: ['agentfeed preview --id draft_pending', 'agentfeed publish --id draft_pending --yes']
    });
  });

  it('renders empty and populated human draft list lines', () => {
    // Given: an empty row set and a populated row set.
    const emptyRows: readonly DraftListRow[] = [];
    const rows = [pendingRow, invalidRow];

    // When: human-readable draft list lines are rendered.
    const emptyLines = renderDraftListHumanLines(emptyRows, Date.parse('2026-06-12T03:00:30.000Z'));
    const lines = renderDraftListHumanLines(rows, Date.parse('2026-06-12T03:00:30.000Z'));

    // Then: empty and populated reports include headings, summaries, rows, and next actions.
    expect(emptyLines.join('\n')).toContain('AgentFeed drafts (0)');
    expect(emptyLines.join('\n')).toContain('No local drafts found.');
    expect(emptyLines.join('\n')).toContain('agentfeed collect --explain');
    expect(lines.join('\n')).toContain('AgentFeed drafts (2)');
    expect(lines.join('\n')).toContain('Invalid: 1');
    expect(lines.join('\n')).toContain('draft_pending  pending  codex  safe · findings 0');
    expect(lines.join('\n')).toContain('Updated: 2026-06-12T03:00:00.000Z (just now)');
    expect(lines.join('\n')).toContain('Project: proj');
    expect(lines.join('\n')).toContain('Title: Pending draft');
    expect(lines.join('\n')).toContain('Metrics: 2 files · +42 -7');
    expect(lines.join('\n')).toContain('Upload: agentfeed publish --id draft_pending --yes');
    expect(lines.join('\n')).toContain('draft_broken  invalid');
    expect(lines.join('\n')).toContain('Error: Unexpected token in JSON');
  });
});

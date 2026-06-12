import { describe, expect, it } from 'vitest';
import { renderCollectHumanLines, collectJsonPayload } from '../src/cli/collect-output.js';
import { createEmptyDraft } from '../src/draft/create.js';

function exampleDraft() {
  const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
  draft.id = 'draft_collect_output';
  draft.worklog.title = 'Collect output contract';
  draft.worklog.summary = 'Collected agent work.';
  draft.worklog.model = 'gpt-5.5';
  draft.worklog.metrics.files_changed = 3;
  draft.worklog.metrics.lines_added = 42;
  draft.worklog.metrics.lines_removed = 7;
  draft.worklog.metrics.tests_run = 5;
  draft.worklog.metrics.tool_calls = 9;
  draft.privacy_scan.status = 'attention';
  return draft;
}

describe('collect output helpers', () => {
  it('builds collect JSON payload with warnings and next actions', () => {
    // Given: a collected draft with warning diagnostics.
    const draft = exampleDraft();

    // When: the CLI builds the machine-readable collect payload.
    const payload = collectJsonPayload({ draft, warnings: ['collection warning'] });

    // Then: the draft contract is preserved and action guidance is attached.
    expect(payload.id).toBe('draft_collect_output');
    expect(payload.project.name).toBe('agentfeed-cli');
    expect(payload.warnings).toEqual(['collection warning']);
    expect(payload.next_actions).toEqual([
      'agentfeed preview --id draft_collect_output',
      'agentfeed publish --id draft_collect_output --yes'
    ]);
  });

  it('renders collect human lines with summary, signals, warnings, explain details, and next actions', () => {
    // Given: collect reused an existing draft in dry-run explain mode.
    const draft = exampleDraft();

    // When: the CLI builds the human-readable collect report.
    const lines = renderCollectHumanLines({
      draft,
      reusedExisting: true,
      warnings: ['collection warning'],
      dryRun: true,
      explain: true
    }, {
      heading: (text) => text,
      section: (text) => text,
      command: (text) => text
    });
    const text = lines.join('\n');

    // Then: the sectioned output preserves the existing visible collect contract.
    expect(text).toContain('AgentFeed draft reused');
    expect(text).toContain('Existing matching draft reused.');
    expect(text).toContain('Warnings');
    expect(text).toContain('Warning: collection warning');
    expect(text).toContain('Summary');
    expect(text).toContain('ID: draft_collect_output');
    expect(text).toContain('Project: agentfeed-cli');
    expect(text).toContain('Title: Collect output contract');
    expect(text).toContain('Privacy: attention');
    expect(text).toContain('Mode: dry run (local draft only; no upload attempted)');
    expect(text).toContain('Signals');
    expect(text).toContain('Agent: codex');
    expect(text).toContain('Models: gpt-5.5');
    expect(text).toContain('Metrics: 3 files · +42 -7 · 5 tests · 9 tool calls');
    expect(text).toContain('Collection');
    expect(text).toContain('Collection quality: unknown');
    expect(text).toContain('Next');
    expect(text).toContain('Recommended order:');
    expect(text).toContain('1. agentfeed preview --id draft_collect_output');
    expect(text).toContain('2. agentfeed publish --id draft_collect_output --yes');
  });
});

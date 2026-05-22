import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { formatSharePreview, parseShareArgs } from '../src/cli/share.js';

describe('share command helpers', () => {
  it('renders a private-review preview before upload', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.title = 'Add share command';
    draft.worklog.summary = 'Created a one-command share flow.';
    draft.worklog.model = 'gpt-5.5';
    draft.worklog.changed_areas = ['CLI', 'Documentation'];
    draft.worklog.metrics.files_changed = 3;
    draft.worklog.metrics.lines_added = 120;
    draft.worklog.metrics.lines_removed = 18;
    draft.worklog.metrics.tokens_used = 12_345;
    draft.worklog.metrics.tool_calls = 7;
    draft.worklog.metrics.collection_quality = 'high';
    draft.worklog.metrics.collection_sources = [
      { type: 'agent_session', name: 'codex', quality: 'high' },
      { type: 'plugin_metadata', name: 'omx', quality: 'medium' }
    ];

    const output = formatSharePreview(draft);

    expect(output).toContain('Ready to share private review draft');
    expect(output).toContain('Project: agentfeed-cli');
    expect(output).toContain('Title: Add share command');
    expect(output).toContain('Agent: codex · gpt-5.5');
    expect(output).toContain('Metrics: 3 files · +120 -18 · 7 tool calls · 12K tokens');
    expect(output).toContain('Changed areas: CLI, Documentation');
    expect(output).toContain('Privacy: safe · findings 0');
    expect(output).toContain('Collection quality: high');
    expect(output).toContain('- agent_session: codex (high)');
    expect(output).toContain('- plugin_metadata: omx (medium)');
  });

  it('parses share-specific options and preserves collect source options', () => {
    expect(parseShareArgs(['--dry', '--open-review', '--source', 'gemini-cli', '--session-file=/tmp/session.jsonl', '--since', '2026-05-20T01:00:00Z', '--until=2026-05-20T02:00:00Z'])).toEqual({
      dryRun: true,
      openReview: true,
      json: false,
      source: 'gemini_cli',
      sessionFile: '/tmp/session.jsonl',
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z'
    });
  });
});

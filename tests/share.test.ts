import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { formatPrivacyPolicyLines, formatSharePreview, parseShareArgs, privacyPolicySummary } from '../src/cli/share.js';
import { option } from '../src/cli/args.js';

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
    expect(parseShareArgs(['--dry', '--open-review', '--source', 'gemini-cli', '--session-file=/tmp/session.jsonl', '--since', '2026-05-20T01:00:00Z', '--until=2026-05-20T02:00:00Z', '--note', 'Refined login flow', '--no-clipboard', '--run-configured-commands'])).toEqual({
      dryRun: true,
      openReview: true,
      json: false,
      source: 'gemini_cli',
      sessionFile: '/tmp/session.jsonl',
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      note: 'Refined login flow',
      noClipboard: true,
      runConfiguredCommands: true,
      yes: false
    });
    expect(parseShareArgs(['--yes']).yes).toBe(true);
  });

  it('rejects missing option values before treating flags as values', () => {
    expect(() => option(['--token', '--no-save'], '--token')).toThrow(/--token requires a value/);
    expect(() => option(['--source='], '--source')).toThrow(/--source requires a value/);
    expect(() => parseShareArgs(['--source', '--json'])).toThrow(/--source requires a value/);
  });

  it('rejects unsupported share source values before creating drafts', () => {
    expect(() => parseShareArgs(['--source', 'banana-agent'])).toThrow(/Unsupported agent source/i);
  });

  it('renders a user note in the share preview', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.summary = 'Collected agent work.';
    draft.worklog.user_note = 'Refined login flow';

    const output = formatSharePreview(draft);

    expect(output).toContain('Note: Refined login flow');
    expect(output).toContain('Summary: Collected agent work.');
  });

  it('explains that high-severity findings block public publishing but not private review upload', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.privacy_scan = {
      status: 'danger',
      findings: [{
        id: 'finding-1',
        type: 'api_key_pattern',
        severity: 'high',
        message: 'Possible secret',
        field: 'worklog.summary',
        sample_redacted: '[REDACTED_SECRET]',
        resolved: false,
      }],
    };

    const output = formatSharePreview(draft);

    expect(output).toContain('Privacy: danger · findings 1');
    expect(output).toContain('Privacy review: required before public publishing.');
    expect(output).toContain('Public/unlisted publishing is blocked in AgentFeed until high-severity findings are resolved.');
    expect(output).toContain('Private review upload is allowed so you can resolve findings in the web review.');
    expect(formatPrivacyPolicyLines(draft)).toHaveLength(3);
    expect(privacyPolicySummary(draft)).toEqual({
      private_review_upload: 'allowed',
      public_publish_blocked: true,
      review_required: true,
    });
  });

  it('warns when share preview has no agent collection evidence', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.metrics.collection_quality = null;
    draft.worklog.metrics.collection_sources = [];

    const output = formatSharePreview(draft);

    expect(output).toContain('Collection quality: unknown');
    expect(output).toContain('Collection sources: none');
    expect(output).toContain('Collection guidance:');
    expect(output).toContain('Run `agentfeed doctor` to verify Claude/Codex/Cursor/Gemini session and plugin detection.');
    expect(output).toContain('Retry with `agentfeed collect --explain --session-file <path>` if your agent log is stored outside the default locations.');
    expect(output).toContain('Without agent evidence, this draft may be mostly git-diff based.');
  });

  it('shows idle-gap inferred collection windows in the share preview', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.source.collection_window = { since: '2026-05-20T01:01:00.000Z', until: '2026-05-20T02:00:00.000Z' };
    draft.source.collection_window_reason = 'idle_gap';

    const output = formatSharePreview(draft);

    expect(output).toContain('Collection window: 2026-05-20T01:01:00.000Z → 2026-05-20T02:00:00.000Z (auto-sliced after idle gap)');
  });

  it('does not render disabled file stats as zero file changes', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.metrics.files_changed = null;
    draft.worklog.metrics.lines_added = null;
    draft.worklog.metrics.lines_removed = null;
    draft.worklog.metrics.tokens_used = 12_345;
    draft.worklog.summary = 'The AI agent worked on application code.';

    const output = formatSharePreview(draft);

    expect(output).not.toContain('0 files');
    expect(output).toContain('Metrics: 12K tokens');
  });
});

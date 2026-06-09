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
    expect(output).toContain('Agent: codex');
    expect(output).toContain('Models: gpt-5.5');
    expect(output).toContain('Metrics: 3 files · +120 -18 · 7 tool calls · 12K tokens');
    expect(output).toContain('Changed areas: CLI, Documentation');
    expect(output).toContain('Privacy: safe · findings 0');
    expect(output).toContain('Collection quality: high');
    expect(output).toContain('- agent_session: codex (high)');
    expect(output).toContain('- plugin_metadata: omx (medium)');
  });

  it('parses share-specific options and preserves collect source options', () => {
    expect(parseShareArgs(['--dry', '--open-review', '--source', 'gemini-cli', '--session-file=/tmp/session.jsonl', '--since', '2026-05-20T01:00:00Z', '--until=2026-05-20T02:00:00Z', '--note', 'Refined login flow', '--no-clipboard', '--no-save-cursor', '--run-configured-commands'])).toEqual({
      dryRun: true,
      openReview: true,
      noOpenReview: false,
      json: false,
      explain: false,
      source: 'gemini_cli',
      sessionFile: '/tmp/session.jsonl',
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      note: 'Refined login flow',
      noClipboard: true,
      noSaveCursor: true,
      runConfiguredCommands: true,
      yes: false
    });
    expect(parseShareArgs(['--explain']).explain).toBe(true);
    expect(parseShareArgs(['--yes']).yes).toBe(true);
    expect(parseShareArgs(['--no-open-review']).noOpenReview).toBe(true);
  });

  it('rejects missing option values before treating flags as values', () => {
    expect(() => option(['--token', '--no-save'], '--token')).toThrow(/--token requires a value/);
    expect(() => option(['--source='], '--source')).toThrow(/--source requires a value/);
    expect(() => parseShareArgs(['--source', '--json'])).toThrow(/--source requires a value/);
  });

  it('rejects unsupported share source values before creating drafts', () => {
    expect(() => parseShareArgs(['--source', 'gemni-cli'])).toThrow(/Unsupported agent source: gemni-cli[\s\S]*Tip: omit --source to let AgentFeed auto-detect Claude\/Codex\/Cursor\/Gemini sessions\.[\s\S]*Did you mean: --source gemini-cli[\s\S]*Run: agentfeed share --dry[\s\S]*Run: agentfeed share --source gemini-cli --dry[\s\S]*Run: agentfeed share --help/i);
  });


  it('wraps long share preview prose for narrow terminals', () => {
    const previousColumns = process.env.COLUMNS;
    process.env.COLUMNS = '56';
    try {
      const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
      draft.worklog.summary = 'The AI agent worked on application code, test coverage, configuration, authentication, api layer, documentation, and UI components.';
      draft.worklog.changed_areas = ['Application code', 'Test coverage', 'Configuration', 'Authentication', 'API layer', 'Documentation', 'UI components'];
      draft.worklog.metrics.files_changed = 23;
      draft.worklog.metrics.lines_added = 1495;
      draft.worklog.metrics.lines_removed = 164;
      draft.worklog.metrics.tests_run = 150;
      draft.worklog.metrics.tool_calls = 1295;
      draft.worklog.metrics.tokens_used = 2_620_000_000;
      draft.worklog.metrics.agent_metrics = [
        { agent: 'codex', model: 'gpt-5.5', tokens_used: 2_620_000_000, files_changed: 23, lines_added: 1495, lines_removed: 164, tool_calls: 1295, commands_run: 849 }
      ];

      const output = formatSharePreview(draft);
      const lines = output.split('\n');
      const summaryLines = lines.filter((line) => line.startsWith('Summary:') || line.startsWith('         '));
      const changedAreaLines = lines.filter((line) => line.startsWith('Changed areas:') || line.startsWith('               '));
      const metricsLines = lines.filter((line) => line.startsWith('Metrics:') || line.startsWith('         '));
      const perAgentLines = lines.filter((line) => line.startsWith('- codex:') || line.startsWith('         '));

      expect(output).toContain('Summary: The AI agent worked on application code, test');
      expect(summaryLines.length).toBeGreaterThan(1);
      expect(changedAreaLines.length).toBeGreaterThan(1);
      expect(metricsLines.length).toBeGreaterThan(1);
      expect(perAgentLines.length).toBeGreaterThan(1);
      for (const line of [...summaryLines, ...changedAreaLines, ...metricsLines, ...perAgentLines]) {
        expect(line.length).toBeLessThanOrEqual(56);
      }
    } finally {
      if (previousColumns === undefined) delete process.env.COLUMNS;
      else process.env.COLUMNS = previousColumns;
    }
  });

  it('renders a user note in the share preview', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.summary = 'Collected agent work.';
    draft.worklog.user_note = 'Refined login flow';

    const output = formatSharePreview(draft);

    expect(output).toContain('Note: Refined login flow');
    expect(output).toContain('Summary: Collected agent work.');
  });

  it('neutralizes terminal control sequences in share preview text', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli\u001b]52;c;secret\u0007', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.id = 'draft_safe\u001b[31m';
    draft.worklog.title = 'Add share command\u001b[31m';
    draft.worklog.summary = 'Created a one-command share flow.\r\u001b]8;;https://evil.invalid\u0007link\u001b]8;;\u0007';
    draft.worklog.user_note = 'Refined login flow\u001b[2J';
    draft.worklog.agent = 'codex\u001b[31m';
    draft.worklog.model = 'gpt-5.5\u001b[31m';
    draft.worklog.changed_areas = ['CLI\u001b[31m', 'Documentation'];
    draft.worklog.metrics.collection_sources = [
      { type: 'agent_session\u001b[31m', name: 'codex\u001b[31m', quality: 'high\u001b[31m' }
    ];

    const output = formatSharePreview(draft);

    expect(output).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/);
    expect(output).not.toContain('\x1b');
    expect(output).not.toContain('https://evil.invalid');
    expect(output).toContain('Project: agentfeed-cli');
    expect(output).toContain('Title: Add share command');
    expect(output).toContain('Agent: codex');
    expect(output).toContain('Models: gpt-5.5');
    expect(output).toContain('- agent_session: codex (high)');
  });

  it('explains that high/critical-severity findings block public publishing but not private review upload', () => {
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
    expect(output).toContain('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');
    expect(output).toContain('Private review upload is allowed so you can resolve findings in the web review.');
    expect(formatPrivacyPolicyLines(draft)).toHaveLength(3);
    expect(privacyPolicySummary(draft)).toEqual({
      private_review_upload: 'allowed',
      public_publish_blocked: true,
      review_required: true,
    });
  });

  it('treats unresolved critical privacy findings as public publish blockers even when status is warning', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.privacy_scan = {
      status: 'warning',
      findings: [{
        id: 'finding-critical',
        type: 'possible_secret',
        severity: 'critical',
        message: 'Critical secret signal',
        field: 'worklog.summary',
        resolved: false,
      }],
    };

    expect(privacyPolicySummary(draft)).toEqual({
      private_review_upload: 'allowed',
      public_publish_blocked: true,
      review_required: true,
    });
    expect(formatSharePreview(draft)).toContain('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');

    draft.privacy_scan.findings[0].resolved = true;
    expect(privacyPolicySummary(draft).public_publish_blocked).toBe(false);
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
    expect(output).toContain('Agent evidence is incomplete; tokens, tool calls, commands, models, and per-agent attribution may be missing.');
    expect(output).toContain('Without agent evidence, this draft may be mostly git-diff based instead of full agent-session based.');
    expect(output).toContain('If you used multiple agents, confirm each agent appears under `Sources` or rerun with an explicit `--source`/`--session-file`.');
  });

  it('keeps share preview concise when collection details follow below', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.metrics.collection_quality = null;
    draft.worklog.metrics.collection_sources = [];

    const output = formatSharePreview(draft, { explainDetailsFollow: true });

    expect(output).toContain('Collection quality: unknown');
    expect(output).toContain('Collection details: shown below');
    expect(output).not.toContain('Collection sources: none');
    expect(output).not.toContain('Collection guidance:');
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

  it('uses M/B token units instead of unreadable K-only counts', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.worklog.metrics.files_changed = null;
    draft.worklog.metrics.lines_added = null;
    draft.worklog.metrics.lines_removed = null;
    draft.worklog.metrics.tokens_used = 55_640_583;
    draft.worklog.metrics.agent_metrics = [
      { agent: 'codex', model: 'gpt-5.5', tokens_used: 2_366_942_496, files_changed: 9, lines_added: 1564, lines_removed: 210, tool_calls: 503, commands_run: 319 }
    ];

    const output = formatSharePreview(draft);

    expect(output).toContain('Metrics: 55.6M tokens');
    expect(output).toContain('- codex: gpt-5.5 · 2.37B tokens · 9 files · +1564 -210 · 503 tools · 319 cmds');
    expect(output).not.toContain('55641K tokens');
    expect(output).not.toContain('2366942K tokens');
  });
});

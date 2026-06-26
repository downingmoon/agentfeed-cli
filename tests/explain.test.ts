import { describe, expect, it } from 'vitest';
import { formatCollectionExplain } from '../src/draft/explain.js';
import type { LocalDraft } from '../src/types.js';
import { AGENTFEED_TOOL_VERSION } from '../src/version.js';

function draftWithMetrics(metrics: LocalDraft['worklog']['metrics']): LocalDraft {
  return {
    schema_version: '0.2',
    id: 'draft_1',
    project: { name: 'agentfeed-cli' },
    worklog: {
      title: 'Collected agent work',
      summary: 'Summary',
      agent: 'codex',
      category: 'ai_tool',
      tags: [],
      visibility: 'private',
      metrics,
      changed_areas: [],
      outcome: [],
      timeline: []
    },
    privacy_scan: { status: 'safe', findings: [] },
    source: { agent: 'codex', tool_version: AGENTFEED_TOOL_VERSION, created_at: '2026-05-21T00:00:00Z', collection_window: { since: '2026-05-20T01:00:00.000Z', until: '2026-05-20T02:00:00.000Z' } },
    upload: { uploaded: false }
  };
}

describe('collection explain output', () => {
  it('summarizes collection quality and sources without local file paths', () => {
    const output = formatCollectionExplain(draftWithMetrics({
      files_changed: 1,
      lines_added: 2,
      lines_removed: 0,
      collection_quality: 'high',
      collection_sources: [
        { type: 'agent_session', name: 'codex', quality: 'high' },
        { type: 'plugin_metadata', name: 'omx', quality: 'medium' }
      ]
    }));

    expect(output).toContain('Collection quality: high');
    expect(output).toContain('- agent_session: codex (high)');
    expect(output).toContain('- plugin_metadata: omx (medium)');
    expect(output).not.toContain('/Users/');
  });


  it('uses compact token units for per-agent metrics', () => {
    const output = formatCollectionExplain(draftWithMetrics({
      files_changed: 9,
      lines_added: 1564,
      lines_removed: 210,
      tokens_used: 55_640_583,
      collection_quality: 'high',
      agent_metrics: [
        { agent: 'codex', model: 'gpt-5.5', tokens_used: 2_366_942_496, files_changed: 9, lines_added: 1564, lines_removed: 210, tool_calls: 503, commands_run: 319 }
      ]
    }));

    expect(output).toContain('- codex: gpt-5.5 · 2.37B tokens · 9 files · +1564 -210 · 503 tool calls · 319 commands');
    expect(output).not.toContain('2366942496 tokens');
    expect(output).not.toContain('2366942K tokens');
  });

  it('prints actionable diagnostics when collection evidence is missing', () => {
    const output = formatCollectionExplain(draftWithMetrics({
      files_changed: 0,
      lines_added: 0,
      lines_removed: 0,
      collection_quality: null,
      collection_sources: []
    }));

    expect(output).toContain('Collection quality: unknown');
    expect(output).toContain('Sources:');
    expect(output).toContain('- none');
    expect(output).toContain('Collection guidance:');
    expect(output).toContain('Run `agentfeed doctor` to verify Claude/Codex/Cursor/Gemini/Antigravity session and plugin detection.');
    expect(output).toContain('Retry with `agentfeed collect --explain --session-file <path>` if your agent log is stored outside the default locations.');
    expect(output).toContain('Agent evidence is incomplete; tokens, tool calls, commands, models, and per-agent attribution may be missing.');
    expect(output).toContain('Without agent evidence, this draft may be mostly git-diff based instead of full agent-session based.');
    expect(output).toContain('If you used multiple agents, confirm each agent appears under `Sources` or rerun with an explicit `--source`/`--session-file`.');
  });
});


// P0: explain should make the scoped collection range visible to users.
describe('collection window explain output', () => {
  it('prints the collection window when present', () => {
    const output = formatCollectionExplain(draftWithMetrics({ files_changed: 0, lines_added: 0, lines_removed: 0 }));

    expect(output).toContain('Collection window: 2026-05-20T01:00:00.000Z → 2026-05-20T02:00:00.000Z');
  });

  it('marks idle-gap inferred collection windows', () => {
    const draft = draftWithMetrics({ files_changed: 0, lines_added: 0, lines_removed: 0 });
    draft.source.collection_window_reason = 'idle_gap';

    const output = formatCollectionExplain(draft);

    expect(output).toContain('Collection window: 2026-05-20T01:00:00.000Z → 2026-05-20T02:00:00.000Z (auto-sliced after idle gap)');
  });
});

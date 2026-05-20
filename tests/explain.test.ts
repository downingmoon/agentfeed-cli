import { describe, expect, it } from 'vitest';
import { formatCollectionExplain } from '../src/draft/explain.js';
import type { LocalDraft } from '../src/types.js';

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
    source: { agent: 'codex', tool_version: 'agentfeed-cli/0.2.0', created_at: '2026-05-21T00:00:00Z' },
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
});

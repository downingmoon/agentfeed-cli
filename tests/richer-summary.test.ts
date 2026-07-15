import { describe, expect, it } from 'vitest';
import type { GitMetrics, WorklogMetrics } from '../src/types.js';
import { generateSummary } from '../src/summary/rule-based.js';
import { generateRicherSummaryFields } from '../src/summary/richer-summary.js';

const gitWithPrivatePath: GitMetrics = {
  dirty: true,
  files_changed: 2,
  lines_added: 24,
  lines_removed: 6,
  changed_files: [
    {
      path: 'src/private/payment-token.ts',
      extension: '.ts',
      language: 'TypeScript',
      status: 'modified',
      lines_added: 24,
      lines_removed: 6,
      publish_path: false,
    },
  ],
};

const richerMetrics: WorklogMetrics = {
  files_changed: 2,
  lines_added: 24,
  lines_removed: 6,
  tests_run: 8,
  tests_passed: 8,
  commands_run: 2,
  failed_commands: 0,
  tool_calls: 11,
  collection_quality: 'high',
  collection_sources: [{ type: 'agent_session', name: 'codex-session', quality: 'high' }],
};

const fallbackMetrics: WorklogMetrics = {
  files_changed: 0,
  lines_added: 0,
  lines_removed: 0,
  tests_run: null,
  tests_passed: null,
  failed_commands: null,
};

const fallbackGit: GitMetrics = {
  dirty: false,
  files_changed: 0,
  lines_added: 0,
  lines_removed: 0,
  changed_files: [],
};

describe('richer summary public contract', () => {
  it('generates public-safe richer fields when local evidence is available', () => {
    // Given: local evidence includes private paths and secret-like tags that must never be public output.
    const rawDiffSnippet = '+ const token = "sk_live_raw_diff_secret_123456789";';

    // When: richer summary fields are generated for uploadable worklog fields.
    const fields = generateRicherSummaryFields({
      areas: ['API layer', 'Test coverage'],
      metrics: richerMetrics,
      git: gitWithPrivatePath,
      tags: ['api', 'src/private/payment-token.ts', 'sk_live_raw_diff_secret_123456789', 'richer-summary'],
      publicPrompt: null,
    });

    // Then: the output is useful, bounded, and contains only public-safe labels/metrics.
    expect(fields.title.length).toBeLessThanOrEqual(120);
    expect(fields.summary.length).toBeLessThanOrEqual(2000);
    expect(fields.title).toBe('Verified API layer and Test coverage changes');
    expect(fields.summary).toContain('This work focused on API layer and Test coverage.');
    expect(fields.summary).toContain('8 passing tests');
    expect(fields.summary).toContain('public-safe labels, metrics, outcomes, and timeline entries');
    expect(fields.changed_areas).toEqual(['API layer', 'Test coverage']);
    expect(fields.public_prompt).toBeNull();
    expect(fields.tags).toEqual(['api', 'richer-summary']);
    expect(fields.outcome).toHaveLength(5);
    expect(fields.outcome).toContain('Captured 8 passing tests as verification evidence');
    expect(fields.timeline.map((item) => item.title)).toEqual([
      'Collected local evidence',
      'Classified public-safe changed areas',
      'Generated richer public summary',
      'Ran privacy scan before upload',
    ]);
    const serialized = JSON.stringify(fields);
    expect(serialized).not.toContain('src/private/payment-token.ts');
    expect(serialized).not.toContain('sk_live_raw_diff_secret_123456789');
    expect(serialized).not.toContain(rawDiffSnippet);
  });

  it('keeps a narrative fallback summary when richer evidence is missing', () => {
    // Given: only low-information safe area labels are available.
    const areas = ['Application code'];

    // When: richer generation cannot improve the public draft safely.
    const fields = generateRicherSummaryFields({
      areas,
      metrics: fallbackMetrics,
      git: fallbackGit,
      tags: [],
      publicPrompt: null,
    });

    // Then: the fallback still reads as a public build story, not a raw metric sentence.
    expect(fields.title).toBe('Explored project with AI agent');
    expect(fields.summary).toBe(generateSummary(areas, fallbackMetrics));
    expect(fields.summary).toContain('reviewable build story');
    expect(fields.summary).toContain('Application code');
    expect(fields.summary).not.toContain('changed 0 files with 0 additions and 0 deletions');
    expect(fields.changed_areas).toEqual(areas);
    expect(fields.public_prompt).toBeNull();
    expect(fields.outcome).toContain('Generated a reviewable AI worklog draft');
    expect(fields.timeline[0]?.title).toBe('Collected AI agent session metadata');
  });

  it('keeps metrics as supporting evidence in fallback summaries', () => {
    // Given: aggregate metrics are available but no richer session evidence is present.
    const metrics: WorklogMetrics = {
      files_changed: 3,
      lines_added: 42,
      lines_removed: 8,
      tests_run: 5,
      tests_passed: 4,
      failed_commands: null,
    };

    // When: a fallback summary is generated.
    const summary = generateSummary(['API layer', 'Review flow'], metrics);

    // Then: the text leads with outcome/context and makes aggregate counts secondary.
    expect(summary).toContain('API layer and Review flow');
    expect(summary).toContain('Supporting evidence: 3 files touched');
    expect(summary).toContain('4/5 tests passing');
    expect(summary).not.toMatch(/^The AI agent worked on/);
  });
});

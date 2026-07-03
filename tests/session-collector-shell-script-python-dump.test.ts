import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script Python dump evidence', () => {
  it('captures Python JSON and YAML dump file targets with unknown line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-dump-targets-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'import json, yaml',
          'from pathlib import Path',
          "data = {'first': True, 'second': True}",
          "json.dump(data, open('src/generated-json.json', 'w'), indent=2)",
          "json.dump(data, Path('src/generated-path-json.json').open('w'), indent=2)",
          "with open('src/generated-yaml.yml', 'w') as handle:",
          '    yaml.safe_dump(data, handle)',
          "with open('src/generated-yaml-handle-literal.yml', 'w') as literal_handle:",
          "    yaml.safe_dump({'first': True, 'second': True}, literal_handle)",
          "json.dump({'first': True, 'second': True}, open('src/generated-json-literal.json', 'w'), indent=2)",
          "yaml.safe_dump({'first': True, 'second': True}, open('src/generated-yaml-literal.yml', 'w'))",
          'PY'
        ].join('\n')
      }, files);

      const summaries = [...files.values()]
        .map((file) => [file.path, file.lines_added])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0])));

      expect(summaries).toEqual([
        ['src/generated-json-literal.json', 4],
        ['src/generated-json.json', null],
        ['src/generated-path-json.json', null],
        ['src/generated-yaml-handle-literal.yml', 2],
        ['src/generated-yaml-literal.yml', 2],
        ['src/generated-yaml.yml', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

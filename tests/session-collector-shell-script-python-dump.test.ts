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

  it('captures deterministic nested Python JSON dump literals with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-nested-json-dump-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'import json',
          'from pathlib import Path',
          "json.dump({'first': {'enabled': True}, 'items': ['one', 'two']}, open('src/generated-nested-json.json', 'w'), indent=2)",
          "json.dump([{'name': 'one'}, {'name': 'two'}], Path('src/generated-nested-list.json').open('w'), indent=2)",
          "with open('src/generated-nested-handle.json', 'w') as handle:",
          "    json.dump({'outer': {'inner': False}}, handle, indent=2)",
          'PY'
        ].join('\n')
      }, files);

      const summaries = [...files.values()]
        .map((file) => [file.path, file.lines_added])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0])));

      expect(summaries).toEqual([
        ['src/generated-nested-handle.json', 5],
        ['src/generated-nested-json.json', 9],
        ['src/generated-nested-list.json', 8]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures deterministic nested Python YAML dump literals with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-nested-yaml-dump-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'import yaml',
          'from pathlib import Path',
          "yaml.safe_dump({'first': {'enabled': True}, 'items': ['one', 'two']}, open('src/generated-nested-yaml.yml', 'w'))",
          "yaml.dump([{'name': 'one'}, {'name': 'two'}], Path('src/generated-nested-list.yml').open('w'))",
          "with open('src/generated-nested-handle.yml', 'w') as handle:",
          "    yaml.safe_dump({'outer': {'inner': False}}, handle)",
          'PY'
        ].join('\n')
      }, files);

      const summaries = [...files.values()]
        .map((file) => [file.path, file.lines_added])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0])));

      expect(summaries).toEqual([
        ['src/generated-nested-handle.yml', 2],
        ['src/generated-nested-list.yml', 2],
        ['src/generated-nested-yaml.yml', 5]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python YAML flow-style dump literals as one-line writes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-flow-yaml-dump-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'import yaml',
          'from pathlib import Path',
          "yaml.safe_dump({'first': True, 'second': True}, open('src/generated-flow-yaml.yml', 'w'), default_flow_style=True)",
          "yaml.dump([{'name': 'one'}, {'name': 'two'}], Path('src/generated-flow-list.yml').open('w'), default_flow_style=True)",
          "with open('src/generated-flow-handle.yml', 'w') as handle:",
          "    yaml.safe_dump({'first': {'enabled': True}, 'items': ['one', 'two']}, handle, default_flow_style=True)",
          'PY'
        ].join('\n')
      }, files);

      const summaries = [...files.values()]
        .map((file) => [file.path, file.lines_added])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0])));

      expect(summaries).toEqual([
        ['src/generated-flow-handle.yml', 1],
        ['src/generated-flow-list.yml', 1],
        ['src/generated-flow-yaml.yml', 1]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

});

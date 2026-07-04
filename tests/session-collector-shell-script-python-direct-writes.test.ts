import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script Python direct path writes', () => {
  it('captures direct Python Path.open write targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-direct-path-open-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          'Path("src/direct-open.ts").open("w").write("""export const generated = true;\\n""")',
          'Path("src/direct-open-content.ts").open("w").write(content)',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/direct-open-content.ts', 2],
        ['src/direct-open.ts', 1]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures direct Python Path.open named-mode write targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-direct-path-open-named-mode-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          'Path("src/named-mode.ts").open(mode="w", encoding="utf-8").write("""export const generated = true;\\n""")',
          'Path("src/named-mode-content.ts").open(mode="a", encoding="utf-8").write(content)',
          'Path("src/read-mode.ts").open(mode="r", encoding="utf-8").write("""ignored\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/named-mode-content.ts', 2],
        ['src/named-mode.ts', 1]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures direct Python Path.write_text keyword data targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-write-text-keyword-data-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          'Path("src/write-text-data.ts").write_text(data="""export const generated = true;\\n""", encoding="utf-8")',
          'Path("src/write-text-data-content.ts").write_text(data=content, encoding="utf-8")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/write-text-data-content.ts', 2],
        ['src/write-text-data.ts', 1]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures direct Python literal path expression and binary writes as changed files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-direct-expression-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'import json',
          "Path('src/generated.json').write_text(json.dumps({'ok': True}, indent=2) + '\n')",
          "Path('assets/icon.bin').write_bytes(b'abc')",
          "open('assets/raw.bin', 'wb').write(b'raw')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['assets/icon.bin', null],
        ['assets/raw.bin', null],
        ['src/generated.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

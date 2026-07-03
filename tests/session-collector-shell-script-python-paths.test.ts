import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script Python path bindings', () => {
  it('captures Python open write targets when the path is a string variable', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-binding-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          "p = 'tsconfig.json'",
          'content = """{\\n  \\"ok\\": true\\n}\\n"""',
          "open(p, 'w').write(content)",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['tsconfig.json', 3]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python open write targets with path variables and expression content as changed files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-expression-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'import json',
          "p = 'tsconfig.json'",
          'data = json.load(open(p))',
          'open(p, \'w\').write(json.dumps(data, indent=2) + "\\n")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['tsconfig.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python Path variable write_text calls with unknown expression content as changed files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-bound-expression-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "p = Path('src/api.ts')",
          's = p.read_text()',
          "s = s.replace('export const ok = true;', 'export const ok = false;')",
          'p.write_text(s)',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/api.ts', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures inline Python Path.open context manager write targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-open-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'with Path("src/generated.ts").open("w") as f:',
          '    f.write("""export const generated = true;\\nexport const ok = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated.ts', 2]
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

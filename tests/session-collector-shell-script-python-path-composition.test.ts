import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script Python path composition bindings', () => {
  it('captures Python Path division bindings with literal segments', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-division-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "base = Path('src')",
          "target = base / 'generated.ts'",
          'target.write_text("""export const first = true;\\nexport const second = true;\\n""")',
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

  it('captures Python Path division bindings with multiple literal segments', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-multi-division-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "base = Path('src')",
          "target = base / 'generated' / 'feature.ts'",
          'target.write_text("""export const first = true;\\nexport const second = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated/feature.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python Path joinpath bindings with literal segments', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-joinpath-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "base = Path('src')",
          "target = base.joinpath('generated', 'feature.ts')",
          'target.write_text("""export const first = true;\\nexport const second = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated/feature.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures direct Python Path joinpath writes with literal segments', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-direct-joinpath-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'Path(\'src\').joinpath(\'generated\', \'direct.ts\').write_text("""export const first = true;\\nexport const second = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated/direct.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });


  it('captures direct Python Path joinpath writes with bound content', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-direct-joinpath-content-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\nexport const second = true;\n"""',
          "Path('src').joinpath('generated', 'content.ts').write_text(content)",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated/content.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures direct Python Path division writes with literal segments', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-direct-division-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          '(Path(\'src\') / \'generated\' / \'direct-division.ts\').write_text("""export const first = true;\\nexport const second = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated/direct-division.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures direct Python Path division writes with bound content', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-direct-division-content-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          "(Path('src') / 'generated' / 'division-content.ts').write_text(content)",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated/division-content.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

});

import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script variable write options', () => {
  it('captures Python content variable writes with encoding options', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-variable-options-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          "Path('src/generated-content-variable.ts').write_text(content, encoding='utf-8')",
          "target = Path('src/generated-bound-content-variable.ts')",
          "target.write_text(content, encoding='utf-8')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-bound-content-variable.ts', 2],
        ['src/generated-content-variable.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures shell apply_patch heredoc file evidence with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-apply-patch-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "apply_patch <<'PATCH'",
          '*** Begin Patch',
          '*** Add File: src/generated-patch.ts',
          '+export const first = true;',
          '+export const second = true;',
          '*** Update File: src/api.ts',
          '@@',
          '-export const ok = true;',
          '+export const ok = false;',
          '*** End Patch',
          'PATCH'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added, file.lines_removed]).sort()).toEqual([
        ['src/api.ts', 'modified', 1, 1],
        ['src/generated-patch.ts', 'added', 2, 0]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures shell printf and echo redirects with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-literal-redirects-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "printf 'export const first = true;\\nexport const second = true;\\n' > src/generated-printf.ts",
          "echo 'export const third = true;' > src/generated-echo.ts"
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-echo.ts', 1],
        ['src/generated-printf.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures shell printf format argument redirects with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-printf-format-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "printf '%s\\n' 'export const first = true;' 'export const second = true;' > src/generated-printf-format.ts",
          'printf "%s\\n" "export const third = true;" "export const fourth = true;" > src/generated-printf-format-double.ts'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-printf-format-double.ts', 2],
        ['src/generated-printf-format.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures shell heredoc tee targets before suppressing redirects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-tee-redirect-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "cat <<'EOF' | tee src/generated-tee.ts >/dev/null",
          'export const first = true;',
          'export const second = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated-tee.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures every shell heredoc tee target when tee writes multiple files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-tee-multiple-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "cat <<'EOF' | tee src/generated-tee-one.ts src/generated-tee-two.ts >/dev/null",
          'export const first = true;',
          'export const second = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-tee-one.ts', 2],
        ['src/generated-tee-two.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures quoted shell heredoc tee targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-tee-quoted-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "cat <<'EOF' | tee 'src/generated tee one.ts' \"src/generated tee two.ts\" >/dev/null",
          'export const first = true;',
          'export const second = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated tee one.ts', 2],
        ['src/generated tee two.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures shell heredoc stdout targets before stderr redirects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-heredoc-stderr-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "cat <<'EOF' > src/generated-cat.ts 2>/dev/null",
          'export const first = true;',
          'export const second = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated-cat.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not count shell heredoc targets overridden by later stdout suppress redirects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-heredoc-stdout-override-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "cat <<'EOF' > src/generated-overridden.ts >/dev/null",
          'export const first = true;',
          'export const second = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => file.path)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

});

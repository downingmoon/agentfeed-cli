import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script file evidence', () => {
  it('captures Python pathlib write_text targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "Path('src/generated.ts').write_text('export const first = true;\\nexport const second = true;\\n')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python pathlib variable write_text targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-variable-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "target = Path('src/generated-variable.ts')",
          "target.write_text('export const first = true;\\nexport const second = true;\\n')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-variable.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python open handle write targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-open-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          "with open('src/generated-open.ts', 'w', encoding='utf-8') as handle:",
          "    handle.write('export const first = true;\\nexport const second = true;\\n')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-open.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });


  it('captures Python triple-quoted pathlib write_text targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-triple-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'Path(\'src/generated-triple.ts\').write_text("""export const first = true;\\nexport const second = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-triple.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python triple-quoted bound write targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-bound-triple-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "target = Path('src/generated-bound-triple.ts')",
          'target.write_text("""export const first = true;\\nexport const second = true;\\n""")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-bound-triple.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python content variable writes with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-content-variable-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          "Path('src/generated-content-variable.ts').write_text(content)",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-content-variable.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node writeFileSync targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { writeFileSync } from 'node:fs';",
          "writeFileSync('src/generated-node.ts', 'export const first = true;\\nexport const second = true;\\n');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-node.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node async writeFile targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-async-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { writeFile } from 'node:fs/promises';",
          "await writeFile('src/generated-node-async.ts', `export const first = true;\\nexport const second = true;\\n`);",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-node-async.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node content variable writeFile targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-content-variable-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { writeFile } from 'node:fs/promises';",
          'const content = `export const first = true;\\nexport const second = true;\\n`;',
          "await writeFile('src/generated-node-content-variable.ts', content);",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-node-content-variable.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

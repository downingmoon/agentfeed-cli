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

  it('captures Node content variable writes with encoding options', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-variable-options-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { writeFile, writeFileSync } from 'node:fs';",
          'const content = `export const first = true;\\nexport const second = true;\\n`;',
          "writeFileSync('src/generated-node-sync.ts', content, 'utf8');",
          "await writeFile('src/generated-node-async.ts', content, { encoding: 'utf8' });",
          "await fs.promises.writeFile('src/generated-node-promises.ts', content, 'utf8');",
          "fs.appendFileSync('src/generated-node-append.ts', content, 'utf8');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-node-append.ts', 2],
        ['src/generated-node-async.ts', 2],
        ['src/generated-node-promises.ts', 2],
        ['src/generated-node-sync.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });


  it('captures Node createWriteStream variable writes with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-stream-variable-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { createWriteStream } from 'node:fs';",
          'const content = `export const first = true;\nexport const second = true;\n`;',
          "const stream = createWriteStream('src/generated-node-stream.ts');",
          'stream.write(content);',
          "stream.end('export const third = true;\n');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['src/generated-node-stream.ts', 3]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });


  it('captures direct Node createWriteStream writes with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-direct-stream-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { createWriteStream } from 'node:fs';",
          'const content = `export const first = true;\nexport const second = true;\n`;',
          "createWriteStream('src/generated-node-direct-stream.ts').write(content);",
          "createWriteStream('src/generated-node-direct-stream-end.ts').end('export const third = true;\n');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-node-direct-stream-end.ts', 1],
        ['src/generated-node-direct-stream.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

});

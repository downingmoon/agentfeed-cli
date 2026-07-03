import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script JavaScript runtime write evidence', () => {
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

  it('captures Node expression writes as changed files without guessed line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-expression-writes-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { writeFileSync } from 'node:fs';",
          "import { writeFile } from 'node:fs/promises';",
          "writeFileSync('dist/data.json', JSON.stringify({ ok: true }, null, 2));",
          "fs.writeFileSync('assets/icon.bin', Buffer.from('abc'));",
          "await fs.promises.writeFile('dist/promises.json', JSON.stringify({ ok: true }));",
          "await writeFile('dist/async.json', JSON.stringify({ ok: true }));",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['assets/icon.bin', null],
        ['dist/async.json', null],
        ['dist/data.json', null],
        ['dist/promises.json', null]
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

  it('captures Node stream and FileHandle expression writes without guessed line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-stream-expression-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { createWriteStream } from 'node:fs';",
          "import { open } from 'node:fs/promises';",
          "const stream = createWriteStream('dist/bound-stream.json');",
          "stream.write(JSON.stringify({ ok: true }));",
          "createWriteStream('dist/direct-stream.json').end(Buffer.from('abc'));",
          "const handle = await open('dist/bound-filehandle.json', 'w');",
          "await handle.writeFile(JSON.stringify({ ok: true }));",
          "await (await open('dist/direct-filehandle.bin', 'w')).writeFile(Buffer.from('abc'));",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['dist/bound-filehandle.json', null],
        ['dist/bound-stream.json', null],
        ['dist/direct-filehandle.bin', null],
        ['dist/direct-stream.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node FileHandle writeFile writes with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-filehandle-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { open } from 'node:fs/promises';",
          'const content = `export const first = true;\nexport const second = true;\n`;',
          "const handle = await open('src/generated-filehandle.ts', 'w');",
          'await handle.writeFile(content);',
          "await (await open('src/generated-direct-filehandle.ts', 'w')).writeFile('export const third = true;\n');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-direct-filehandle.ts', 1],
        ['src/generated-filehandle.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Bun and Deno text writes with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-js-runtime-writes-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "bun run <<'JS'",
          'const content = `export const first = true;\nexport const second = true;\n`;',
          "await Bun.write('src/generated-bun.ts', content);",
          "await Deno.writeTextFile('src/generated-deno.ts', 'export const third = true;\n');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-bun.ts', 2],
        ['src/generated-deno.ts', 1]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

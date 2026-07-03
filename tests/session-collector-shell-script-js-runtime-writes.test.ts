import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script JavaScript runtime write evidence', () => {
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

  it('captures Bun and Deno expression writes without guessed line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-js-runtime-expression-writes-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "bun run <<'JS'",
          "await Bun.write('dist/bun-data.json', JSON.stringify({ ok: true }));",
          "await Bun.write('dist/bun-bytes.bin', Buffer.from('abc'));",
          "await Deno.writeTextFile('dist/deno-data.json', JSON.stringify({ ok: true }));",
          "await Deno.writeFile('dist/deno-bytes.bin', new TextEncoder().encode('abc'));",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['dist/bun-bytes.bin', null],
        ['dist/bun-data.json', null],
        ['dist/deno-bytes.bin', null],
        ['dist/deno-data.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Bun and Deno path variable writes without guessed line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-js-runtime-path-variable-writes-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "bun run <<'JS'",
          "const bunDataPath = 'dist/bun-data.json';",
          "const bunBytePath = 'dist/bun-bytes.bin';",
          "const denoTextPath = 'dist/deno-data.json';",
          "const denoBytePath = 'dist/deno-bytes.bin';",
          'await Bun.write(bunDataPath, JSON.stringify({ ok: true }));',
          "await Bun.write(bunBytePath, Buffer.from('abc'));",
          'await Deno.writeTextFile(denoTextPath, JSON.stringify({ ok: true }));',
          "await Deno.writeFile(denoBytePath, new TextEncoder().encode('abc'));",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['dist/bun-bytes.bin', null],
        ['dist/bun-data.json', null],
        ['dist/deno-bytes.bin', null],
        ['dist/deno-data.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Bun and Deno writes through deterministic path joins', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-js-runtime-joined-path-writes-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "bun run <<'JS'",
          "const outDir = 'dist';",
          'const content = `export const first = true;\\nexport const second = true;\\n`;',
          "await Bun.write(path.join(outDir, 'bun-data.ts'), content);",
          "await Deno.writeFile(path.join(outDir, 'deno-bytes.bin'), new TextEncoder().encode('abc'));",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['dist/bun-data.ts', 2],
        ['dist/deno-bytes.bin', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

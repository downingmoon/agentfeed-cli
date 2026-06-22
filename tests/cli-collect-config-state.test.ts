import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { readCollectionState } from '../src/config/collection-state.js';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CommandFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

type CollectDraftOutput = {
  readonly id: string;
  readonly warnings?: readonly string[];
  readonly source?: { readonly collection_window?: { readonly since?: string | null; readonly until?: string | null } };
  readonly worklog?: unknown;
  readonly draft?: unknown;
  readonly draft_id?: unknown;
  readonly next_actions?: readonly string[];
};

type CollectErrorOutput = {
  readonly error: {
    readonly message: string;
    readonly details?: readonly string[];
  };
};

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-collect-config-state-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-cli-home-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  await initProject({ cwd: dir, noGitCheck: false });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string') throw new Error(`expected string field: ${key}`);
  return field;
}

function optionalStringArray(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error('expected optional string array');
  }
  return value;
}

function parseCollectDraftOutput(stdout: string): CollectDraftOutput {
  const value: unknown = JSON.parse(stdout);
  if (!isRecord(value)) throw new Error('collect output must be a JSON object');
  const source = isRecord(value.source) ? value.source : undefined;
  const collectionWindow = source && isRecord(source.collection_window) ? source.collection_window : undefined;
  return {
    id: stringField(value, 'id'),
    warnings: optionalStringArray(value.warnings),
    source: source
      ? {
        collection_window: collectionWindow
          ? {
            since: typeof collectionWindow.since === 'string' || collectionWindow.since === null ? collectionWindow.since : undefined,
            until: typeof collectionWindow.until === 'string' || collectionWindow.until === null ? collectionWindow.until : undefined
          }
          : undefined
      }
      : undefined,
    worklog: value.worklog,
    draft: value.draft,
    draft_id: value.draft_id,
    next_actions: optionalStringArray(value.next_actions)
  };
}

function commandFailureFrom(error: unknown): CommandFailure {
  if (!isRecord(error)) return {};
  const stdout = error.stdout;
  const stderr = error.stderr;
  return {
    stdout: typeof stdout === 'string' ? stdout : undefined,
    stderr: typeof stderr === 'string' ? stderr : undefined
  };
}

function parseCollectErrorOutput(stdout: string | undefined): CollectErrorOutput {
  const value: unknown = JSON.parse(stdout ?? '{}');
  if (!isRecord(value) || !isRecord(value.error)) throw new Error('collect error output must contain error object');
  const error = value.error;
  return {
    error: {
      message: stringField(error, 'message'),
      details: optionalStringArray(error.details)
    }
  };
}

async function runCollectExpectingFailure(args: readonly string[]): Promise<CommandFailure> {
  try {
    await execFileAsync(process.execPath, [cliPath, 'collect', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
  } catch (error) {
    return commandFailureFrom(error);
  }
  throw new Error('expected collect command to fail');
}

describe('collect config and state handling', () => {
  it('warns about a malformed collection cursor instead of silently ignoring it', async () => {
    await writeFile(join(dir, '.agentfeed', 'state.json'), '{not-json');
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "cursor-recovered";\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--until',
      '2026-05-20T02:00:00Z',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = parseCollectDraftOutput(stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.source?.collection_window?.since).toBeNull();
    expect(draft.source?.collection_window?.until).toBe('2026-05-20T02:00:00.000Z');
    expect(draft.warnings).toEqual(expect.arrayContaining([expect.stringContaining('AgentFeed collection cursor is unreadable')]));
  });

  it('warns when malformed saved drafts are skipped during duplicate detection', async () => {
    await mkdir(join(dir, '.agentfeed', 'drafts'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'drafts', 'draft_malformed.json'), '{not-json');
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "malformed-draft-warning";\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--until',
      '2026-05-20T02:00:00Z',
      '--no-save-cursor'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = parseCollectDraftOutput(stdout);
    const warnings = draft.warnings?.join('\n') ?? '';
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Existing AgentFeed draft could not be read and was skipped during duplicate detection: draft_malformed')
    ]));
    expect(warnings).toContain('agentfeed drafts');
    expect(warnings).toContain('agentfeed collect --explain');
  });

  it('fails malformed project config with actionable recovery guidance', async () => {
    await writeFile(join(dir, '.agentfeed', 'config.json'), '{not-json');

    const failure = await runCollectExpectingFailure(['--json']);
    const output = parseCollectErrorOutput(failure.stdout);
    expect(output.error.message).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(output.error.message).toContain('Re-run agentfeed init or restore the file from backup');
    expect(output.error.message).not.toContain('Unexpected token');
    expect(failure.stderr ?? '').toBe('');
  });

  it('fails malformed project config shape before creating a draft', async () => {
    const configPath = join(dir, '.agentfeed', 'config.json');
    const rawConfig: unknown = JSON.parse(await readFile(configPath, 'utf8'));
    if (!isRecord(rawConfig) || !isRecord(rawConfig.project)) throw new Error('expected initialized project config');
    rawConfig.project.tags = 'not-an-array';
    await writeFile(configPath, JSON.stringify(rawConfig, null, 2));

    const failure = await runCollectExpectingFailure(['--json']);
    const output = parseCollectErrorOutput(failure.stdout);
    expect(output.error.message).toContain('AgentFeed config is invalid');
    expect(output.error.message).toContain('project.tags must be an array of strings');
    expect(output.error.message).toContain('Re-run agentfeed init or restore the file from backup');
    expect(output.error.message).not.toContain('TypeError');
    expect(failure.stderr ?? '').toBe('');
  });

  it('persists collection cursor when rendering JSON output', async () => {
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\n');

    const stdout = execFileSync(process.execPath, [
      cliPath,
      'collect',
      '--json',
      '--since',
      '2026-05-20T01:00:00Z',
      '--until',
      '2026-05-20T02:00:00Z'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const draft = parseCollectDraftOutput(stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.worklog).toBeTruthy();
    expect(draft.source).toBeTruthy();
    expect(draft.draft).toBeUndefined();
    expect(draft.draft_id).toBeUndefined();
    expect(draft.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
    expect(draft.source?.collection_window?.until).toBe('2026-05-20T02:00:00.000Z');
    await expect(readCollectionState(dir)).resolves.toEqual({ last_collected_at: '2026-05-20T02:00:00.000Z' });
  });
});

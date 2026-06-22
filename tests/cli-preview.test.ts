import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
let dir: string;
let home: string;

interface PreviewErrorJson {
  readonly error: {
    readonly message: string;
    readonly details: readonly string[];
  };
  readonly next_actions: readonly string[];
}

interface CliFailure extends Error {
  readonly stdout?: unknown;
  readonly stderr?: unknown;
}

function isCliFailure(error: unknown): error is CliFailure {
  return error instanceof Error;
}

function textOutput(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return '';
}

function runPreviewFailure(args: string[]): { stdout: string; stderr: string } {
  try {
    execFileSync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: undefined,
        AGENTFEED_ALLOW_INSECURE_API: undefined
      }
    });
  } catch (error) {
    if (!isCliFailure(error)) {
      throw error;
    }
    return {
      stdout: textOutput(error.stdout),
      stderr: textOutput(error.stderr)
    };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-preview-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('preview CLI command', () => {
  it('guides project initialization before latest preview outside a project', async () => {
    await rm(join(dir, '.agentfeed'), { recursive: true, force: true });

    const { stdout, stderr } = runPreviewFailure(['preview', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('AgentFeed project is not initialized.');
    expect(stderr).toContain('Run: agentfeed init');
    expect(stderr).not.toContain('No local drafts found.');
  });

  it('guides users when no local draft exists for latest preview', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--latest']);

    expect(stdout).toBe('');
    expect(stderr).toContain('No local drafts found.');
    expect(stderr).toContain('Create a draft:');
    expect(stderr).toContain('Run: agentfeed collect --explain');
    expect(stderr).toContain('Run: agentfeed share --dry');
    expect(stderr).toContain('Inspect saved drafts:');
    expect(stderr).toContain('Run: agentfeed drafts');
  });

  it('prints structured JSON errors when preview --json has no local draft', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--latest', '--json']);
    const output: PreviewErrorJson = JSON.parse(stdout);

    expect(stderr).toBe('');
    expect(output.error.message).toBe('No local drafts found.');
    expect(output.error.details).toEqual(expect.arrayContaining(['Create a draft:', 'Inspect saved drafts:']));
    expect(output.next_actions).toEqual([
      'agentfeed collect --explain',
      'agentfeed share --dry',
      'agentfeed drafts'
    ]);
  });

  it('guides users back to drafts and collect when previewing a missing draft id', async () => {
    const { stdout, stderr } = runPreviewFailure(['preview', '--id', 'draft_missing']);

    expect(stdout).toBe('');
    expect(stderr).toContain('Draft not found: draft_missing');
    expect(stderr).toContain('Inspect saved drafts:');
    expect(stderr).toContain('Run: agentfeed drafts');
    expect(stderr).toContain('Create a fresh draft:');
    expect(stderr).toContain('Run: agentfeed collect --explain');
  });

  it('guides login before remote preview when no token is configured', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote preview needs login';
    await writeDraft(dir, draft);

    const { stdout, stderr } = runPreviewFailure(['preview', '--id', draft.id, '--remote']);

    expect(stdout).toBe('');
    expect(stderr).toContain('AgentFeed token is missing.');
    expect(stderr).toContain('Run: agentfeed login');
    expect(stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
  });

});

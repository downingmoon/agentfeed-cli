import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-status-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status config error visibility', () => {
  async function createBrokenProjectConfig(): Promise<void> {
    await mkdir(join(dir, '.agentfeed'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'config.json'), '{not-json');
  }

  it('shows damaged project config in human status instead of treating it as uninitialized', async () => {
    await createBrokenProjectConfig();

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        FORCE_COLOR: undefined,
      },
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('Project: config unreadable → agentfeed init --force');
    expect(stdout).toContain('Project initialized: error');
    expect(stdout).toContain('Project config error: AgentFeed config is unreadable or invalid JSON');
    expect(stdout).toContain(join(dir, '.agentfeed', 'config.json'));
    expect(stdout).toContain('agentfeed init --force');
    expect(stdout).toContain('agentfeed doctor');
    expect(stdout).not.toContain('Project: not initialized');
  });

  it('includes damaged project config details in status json warnings and next actions', async () => {
    await createBrokenProjectConfig();

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        FORCE_COLOR: undefined,
      },
    });

    const output = JSON.parse(stdout) as {
      readonly project?: { readonly initialized?: boolean; readonly config_error?: string | null };
      readonly readiness?: ReadonlyArray<{ readonly name: string; readonly detail: string; readonly next_action?: string }>;
      readonly warnings?: readonly string[];
      readonly next_actions?: readonly string[];
    };

    expect(stderr).toBe('');
    expect(output.project?.initialized).toBe(false);
    expect(output.project?.config_error).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(output.readiness).toContainEqual(expect.objectContaining({
      name: 'Project',
      detail: 'config unreadable',
      next_action: 'agentfeed init --force',
    }));
    expect(output.warnings?.join('\n')).toContain(join(dir, '.agentfeed', 'config.json'));
    expect(output.next_actions).toEqual(['agentfeed init --force', 'agentfeed doctor', 'agentfeed login']);
  });
});

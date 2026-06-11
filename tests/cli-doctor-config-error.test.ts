import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-doctor-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('doctor config error visibility', () => {
  async function createBrokenProjectConfig(): Promise<void> {
    await mkdir(join(dir, '.agentfeed'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'config.json'), '{not-json');
  }

  it('shows damaged project config in human doctor instead of treating it as uninitialized', async () => {
    await createBrokenProjectConfig();

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://127.0.0.1:9/v1',
        FORCE_COLOR: undefined,
      },
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('Project: config unreadable → agentfeed init --force');
    expect(stdout).toContain('project config error: AgentFeed config is unreadable or invalid JSON');
    expect(stdout).toContain(join(dir, '.agentfeed', 'config.json'));
    expect(stdout).toContain('Run: agentfeed init --force');
    expect(stdout).toContain('Run: agentfeed doctor');
    expect(stdout).not.toContain('Project: not initialized');
    expect(stdout).not.toContain('Collection: unavailable until project is initialized');
  });

  it('includes damaged project config details in doctor json warnings and priority actions', async () => {
    await createBrokenProjectConfig();

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://127.0.0.1:9/v1',
        FORCE_COLOR: undefined,
      },
    });

    const output = JSON.parse(stdout) as {
      readonly readiness?: ReadonlyArray<{ readonly name: string; readonly detail: string; readonly next_action?: string }>;
      readonly priority_actions?: ReadonlyArray<{ readonly name: string; readonly detail: string; readonly command?: string }>;
      readonly project?: ReadonlyArray<{ readonly name: string; readonly value: string | boolean }>;
      readonly collection?: ReadonlyArray<{ readonly name: string; readonly value: string | boolean }>;
      readonly warnings?: readonly string[];
      readonly next_actions?: readonly string[];
    };

    expect(stderr).toBe('');
    expect(output.readiness).toContainEqual(expect.objectContaining({
      name: 'Project',
      detail: 'config unreadable',
      next_action: 'agentfeed init --force',
    }));
    expect(output.priority_actions).toContainEqual(expect.objectContaining({
      name: 'Project',
      detail: 'config unreadable',
      command: 'agentfeed init --force',
    }));
    expect(output.project).toContainEqual(expect.objectContaining({
      name: 'project config error',
      value: expect.stringContaining(join(dir, '.agentfeed', 'config.json')),
    }));
    expect(output.collection).toContainEqual(expect.objectContaining({
      name: 'last collection cursor',
      value: 'unavailable (project config unreadable)',
    }));
    expect(output.warnings?.join('\n')).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(output.next_actions).toEqual(['agentfeed init --force', 'agentfeed doctor', 'agentfeed login']);
  });
});

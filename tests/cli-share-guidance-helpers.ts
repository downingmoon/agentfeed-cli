import { beforeAll, beforeEach, afterEach } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CliOutput = { readonly stdout: string; readonly stderr: string };

export function useShareGuidanceFixture() {
  let dir = '';
  let home = '';

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-share-guidance-'));
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

  function isolatedCliEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return {
      ...process.env,
      HOME: home,
      AGENTFEED_TOKEN: '',
      AGENTFEED_API_BASE_URL: undefined,
      AGENTFEED_ALLOW_INSECURE_API: undefined,
      ...extra
    };
  }

  async function runCli(args: string[], env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    return await execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: isolatedCliEnv(env)
    });
  }

  async function runCliFailure(args: string[], env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    try {
      await runCli(args, env);
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
    }
    throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
  }

  return {
    dir: () => dir,
    home: () => home,
    runCli,
    runCliFailure
  };
}

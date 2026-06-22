import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { initProject } from '../src/config/project-config.js';

type ProjectConfig = Record<string, unknown> & {
  collection: Record<string, unknown> & { run_tests_on_collect: boolean };
  commands: Record<string, unknown> & { test: string | null; build: string | null };
};

export type GitDraftConfiguredCommandsFixture = {
  readonly dir: () => string;
  readonly initConfig: () => Promise<{ readonly configPath: string; readonly config: ProjectConfig }>;
  readonly writeAgentFeedScript: (name: string, content: string) => Promise<void>;
  readonly writePackageJson: (scripts: Record<string, string> | string) => Promise<void>;
};

export type EnvSnapshot = Record<string, string | undefined>;

export function useGitDraftConfiguredCommandsFixture(): GitDraftConfiguredCommandsFixture {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-git-commands-'));
    execFileSync('git', ['init'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo\nthree\n');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  return {
    dir: () => dir,
    initConfig: () => initConfiguredCommandsProject(dir),
    writeAgentFeedScript: (name: string, content: string) => writeFile(join(dir, '.agentfeed', name), content),
    writePackageJson: (scripts: Record<string, string> | string) => writePackageJson(dir, scripts),
  };
}

export async function writeConfig(configPath: string, config: ProjectConfig): Promise<void> {
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export function snapshotEnv(names: readonly string[]): EnvSnapshot {
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

export function restoreEnv(snapshot: EnvSnapshot): void {
  for (const [name, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

async function initConfiguredCommandsProject(dir: string): Promise<{ readonly configPath: string; readonly config: ProjectConfig }> {
  await initProject({ cwd: dir, noGitCheck: false });
  const configPath = join(dir, '.agentfeed', 'config.json');
  return { configPath, config: parseProjectConfig(await readFile(configPath, 'utf8')) };
}

async function writePackageJson(dir: string, scripts: Record<string, string> | string): Promise<void> {
  const content = typeof scripts === 'string'
    ? scripts
    : JSON.stringify({ scripts }, null, 2);
  await writeFile(join(dir, 'package.json'), content);
}

function parseProjectConfig(text: string): ProjectConfig {
  const value: unknown = JSON.parse(text);
  if (!isProjectConfig(value)) throw new Error('expected initialized AgentFeed project config');
  return value;
}

function isProjectConfig(value: unknown): value is ProjectConfig {
  return isRecord(value)
    && isRecord(value.collection)
    && typeof value.collection.run_tests_on_collect === 'boolean'
    && isRecord(value.commands)
    && nullableString(value.commands.test)
    && nullableString(value.commands.build);
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

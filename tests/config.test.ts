import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, loadProjectConfig } from '../src/config/project-config.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldAgentFeedHome = process.env.AGENTFEED_HOME;
const oldBase = process.env.AGENTFEED_API_BASE_URL;
const oldToken = process.env.AGENTFEED_TOKEN;
const oldAllowInsecure = process.env.AGENTFEED_ALLOW_INSECURE_API;
const oldAllowInsecureCredentialStore = process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
const oldTrustRepoApiBase = process.env.AGENTFEED_TRUST_REPO_API_BASE;
const oldCredentialStore = process.env.AGENTFEED_CREDENTIAL_STORE;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  delete process.env.AGENTFEED_HOME;
  delete process.env.AGENTFEED_API_BASE_URL;
  delete process.env.AGENTFEED_TOKEN;
  delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  delete process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
  delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  delete process.env.AGENTFEED_CREDENTIAL_STORE;
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedHome === undefined) delete process.env.AGENTFEED_HOME;
  else process.env.AGENTFEED_HOME = oldAgentFeedHome;
  if (oldBase === undefined) delete process.env.AGENTFEED_API_BASE_URL;
  else process.env.AGENTFEED_API_BASE_URL = oldBase;
  if (oldToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = oldToken;
  if (oldAllowInsecure === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  else process.env.AGENTFEED_ALLOW_INSECURE_API = oldAllowInsecure;
  if (oldAllowInsecureCredentialStore === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE;
  else process.env.AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE = oldAllowInsecureCredentialStore;
  if (oldTrustRepoApiBase === undefined) delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  else process.env.AGENTFEED_TRUST_REPO_API_BASE = oldTrustRepoApiBase;
  if (oldCredentialStore === undefined) delete process.env.AGENTFEED_CREDENTIAL_STORE;
  else process.env.AGENTFEED_CREDENTIAL_STORE = oldCredentialStore;
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('project config', () => {
  it('init creates expected directories and valid config', async () => {
    const result = await initProject({ cwd: dir, projectName: 'My CLI', noGitCheck: true });

    expect(result.config.project.name).toBe('My CLI');
    expect(result.config.project.slug).toBe('my-cli');
    expect(result.alreadyInitialized).toBe(false);
    expect(result.backupPaths).toEqual([]);
    await expect(loadProjectConfig(dir)).resolves.toMatchObject({
      version: '0.2',
      project: { visibility: 'private' },
      collection: { auto_collect: true },
      privacy: { raw_diff_upload: false, raw_transcript_upload: false }
    });
    
    const other = await mkdtemp(join(tmpdir(), 'agentfeed-missing-'));
    await expect(loadProjectConfig(other)).rejects.toThrow(/AgentFeed project is not initialized[\s\S]*Run: agentfeed init[\s\S]*Run: agentfeed init --no-git-check/i);
    await rm(other, { recursive: true, force: true });
  });

  it('keeps an existing project config when init is rerun without force', async () => {
    await initProject({ cwd: dir, projectName: 'First CLI', noGitCheck: true });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const rerun = await initProject({ cwd: dir, projectName: 'Second CLI', noGitCheck: true });
    const saved = JSON.parse(await readFile(configPath, 'utf8'));

    expect(rerun.alreadyInitialized).toBe(true);
    expect(rerun.backupPaths).toEqual([]);
    expect(rerun.config.project.name).toBe('First CLI');
    expect(saved.project.name).toBe('First CLI');
    expect(saved.project.tags).toEqual(['custom']);
  });

  it('backs up existing config files before forced reinitialization', async () => {
    await initProject({ cwd: dir, projectName: 'First CLI', noGitCheck: true });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const rulesPath = join(dir, '.agentfeed', 'redaction-rules.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(rulesPath, JSON.stringify({ custom_rule: true }, null, 2));

    const rerun = await initProject({ cwd: dir, projectName: 'Second CLI', noGitCheck: true, force: true });
    const saved = JSON.parse(await readFile(configPath, 'utf8'));

    expect(rerun.alreadyInitialized).toBe(false);
    expect(rerun.backupPaths).toHaveLength(2);
    expect(rerun.backupPaths.every((path) => path.includes(join('.agentfeed', 'backups')))).toBe(true);
    expect(saved.project.name).toBe('Second CLI');
    expect(saved.project.tags).toEqual([]);
    const configBackup = rerun.backupPaths.find((path) => path.includes('config.'));
    const rulesBackup = rerun.backupPaths.find((path) => path.includes('redaction-rules.'));
    expect(configBackup).toBeTruthy();
    expect(rulesBackup).toBeTruthy();
    expect(JSON.parse(await readFile(configBackup!, 'utf8')).project.tags).toEqual(['custom']);
    expect(JSON.parse(await readFile(rulesBackup!, 'utf8')).custom_rule).toBe(true);
  });

  it('rejects malformed project config shapes with clear field-specific errors', async () => {
    await initProject({ cwd: dir, projectName: 'Shape Guard', noGitCheck: true });
    const configPath = join(dir, '.agentfeed', 'config.json');
    const validConfig = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;

    const malformedCases: Array<{ name: string; mutate: (config: Record<string, unknown>) => unknown; expected: RegExp }> = [
      { name: 'non-object root', mutate: () => null, expected: /AgentFeed config is invalid.*root must be an object/i },
      { name: 'missing project object', mutate: (config) => ({ ...config, project: undefined }), expected: /project must be an object/i },
      { name: 'non-array tags', mutate: (config) => ({ ...config, project: { ...(config.project as Record<string, unknown>), tags: 'cli' } }), expected: /project\.tags must be an array of strings/i },
      { name: 'non-object collection settings', mutate: (config) => ({ ...config, collection: true }), expected: /collection must be an object/i },
      { name: 'non-boolean collection flag', mutate: (config) => ({ ...config, collection: { ...(config.collection as Record<string, unknown>), include_test_results: 'yes' } }), expected: /collection\.include_test_results must be a boolean/i },
      { name: 'malformed commands', mutate: (config) => ({ ...config, commands: { ...(config.commands as Record<string, unknown>), test: ['npm', 'test'] } }), expected: /commands\.test must be a string or null/i },
      { name: 'malformed agent block', mutate: (config) => ({ ...config, agents: { ...(config.agents as Record<string, unknown>), codex: true } }), expected: /agents\.codex must be an object/i },
      { name: 'malformed claude hook scope', mutate: (config) => ({ ...config, agents: { ...(config.agents as Record<string, unknown>), claude_code: { enabled: true, hook_scope: 'workspace' } } }), expected: /agents\.claude_code\.hook_scope must be "project" or "global"/i },
    ];

    for (const testCase of malformedCases) {
      await writeFile(configPath, JSON.stringify(testCase.mutate(validConfig), null, 2));
      await expect(loadProjectConfig(dir), testCase.name).rejects.toThrow(testCase.expected);
    }
  });

});

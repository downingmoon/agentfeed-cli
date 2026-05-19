import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, loadProjectConfig } from '../src/config/project-config.js';
import { resolveCredentials } from '../src/config/credentials.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldBase = process.env.AGENTFEED_API_BASE_URL;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-config-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  delete process.env.AGENTFEED_API_BASE_URL;
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldBase === undefined) delete process.env.AGENTFEED_API_BASE_URL;
  else process.env.AGENTFEED_API_BASE_URL = oldBase;
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('project config', () => {
  it('init creates expected directories and valid config', async () => {
    const result = await initProject({ cwd: dir, projectName: 'My CLI', noGitCheck: true });

    expect(result.config.project.name).toBe('My CLI');
    expect(result.config.project.slug).toBe('my-cli');
    await expect(loadProjectConfig(dir)).resolves.toMatchObject({
      version: '0.2',
      project: { visibility: 'private' },
      collection: { auto_collect: true },
      privacy: { raw_diff_upload: false, raw_transcript_upload: false }
    });
    
    const other = await mkdtemp(join(tmpdir(), 'agentfeed-missing-'));
    await expect(loadProjectConfig(other)).rejects.toThrow(/AgentFeed project is not initialized/i);
    await rm(other, { recursive: true, force: true });
  });

  it('env vars override configured credentials', async () => {
    process.env.AGENTFEED_API_BASE_URL = 'http://localhost:8000/v1';
    const creds = await resolveCredentials({ ingestion_token: 'stored', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' });
    expect(creds.api_base_url).toBe('http://localhost:8000/v1');
  });
});

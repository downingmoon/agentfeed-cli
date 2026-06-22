import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';
import {
  parseJsonObject,
  prepareSavedRotateCredentials,
  startRotateBrowserReplacementServer
} from './cli-rotate-browser-replacement-helpers.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-rotate-browser-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('rotate browser token replacement', () => {
  it('rotate replaces a saved token through browser-approved session rotation without printing secrets', async () => {
    await prepareSavedRotateCredentials(home);
    const server = await startRotateBrowserReplacementServer();

    try {
      const { stdout } = await execFileAsync(process.execPath, [cliPath, 'rotate', '--no-open'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: '',
          AGENTFEED_API_BASE_URL: server.apiBaseUrl,
          AGENTFEED_CI: '0',
          CI: '0',
          GITHUB_ACTIONS: '0',
          GITLAB_CI: '0',
          BUILDKITE: '0',
          CIRCLECI: '0',
          JENKINS_URL: '0',
          TF_BUILD: '0',
          TEAMCITY_VERSION: '0',
          VERCEL: '0',
          NETLIFY: '0'
        }
      });

      expect(stdout).toContain('AgentFeed token rotated after browser approval.');
      expect(stdout).toContain('Previous saved token was revoked.');
      expect(stdout).toContain('AgentFeed token replacement complete');
      expect(stdout).toContain('Saved replacement token.');
      expect(stdout).toContain('Summary');
      expect(stdout).toContain('Credentials: saved');
      expect(stdout).toContain(`API: ${server.apiBaseUrl}`);
      expect(stdout).toContain('Token expires at:');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('agentfeed status');
      expect(stdout).toContain('agentfeed share --dry');
      expect(stdout).not.toContain('af_live_old_secret');
      expect(stdout).not.toContain('af_live_new_secret');
      const saved = parseJsonObject(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(saved).toMatchObject({
        ingestion_token: 'af_live_new_secret',
        token_expires_at: server.newExpiry,
        user: { id: 'user-1', username: 'downingmoon' }
      });
    } finally {
      await server.close();
    }
  });
});

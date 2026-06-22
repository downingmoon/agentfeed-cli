import { afterEach, beforeAll, beforeEach } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { draftUploadCredentialBindingHash } from '../src/api/client.js';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import type { LocalDraft } from '../src/types.js';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CliOutput = { readonly stdout: string; readonly stderr: string };

type UploadedDraftOptions = {
  readonly worklogId: string;
  readonly reviewUrl: string;
  readonly uploadedAt?: string;
  readonly apiBaseUrl?: string;
  readonly reviewBaseUrl?: string;
};

export function cachedUploadBindingForOpenReview(apiBaseUrl: string) {
  const credentials = {
    ingestion_token: 'af_live_test_token',
    api_base_url: apiBaseUrl,
    created_at: 'now',
  };
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: null,
    user_id: null,
  };
}

export function useOpenReviewFixture() {
  let dir = '';
  let home = '';
  const cleanupDirs: string[] = [];

  beforeAll(() => {
    ensureCliBuilt(repoRoot);
  });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-open-review-'));
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
    await Promise.all(cleanupDirs.splice(0).map(async path => rm(path, { recursive: true, force: true })));
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  async function createBrowserHarness(): Promise<{ readonly binDir: string; readonly browserLog: string }> {
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-bin-'));
    cleanupDirs.push(binDir);
    const browserLog = join(binDir, 'browser-open.log');
    const script = '#!/usr/bin/env sh\necho "$1" >> "$AGENTFEED_TEST_BROWSER_LOG"\nexit 0\n';
    await Promise.all(['open', 'xdg-open', 'wslview'].map(async name => {
      const path = join(binDir, name);
      await writeFile(path, script);
      await chmod(path, 0o755);
    }));
    return { binDir, browserLog };
  }

  async function writeUploadedDraft(options: UploadedDraftOptions): Promise<LocalDraft> {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.upload = {
      uploaded: true,
      worklog_id: options.worklogId,
      review_url: options.reviewUrl,
      uploaded_at: options.uploadedAt ?? '2026-05-31T00:00:00.000Z',
      api_base_url: options.apiBaseUrl,
      review_base_url: options.reviewBaseUrl,
    };
    await writeDraft(dir, draft);
    return draft;
  }

  async function runOpen(draftId: string, env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    return await execFileAsync(process.execPath, [cliPath, 'open', '--id', draftId], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, ...env },
    });
  }

  function runOpenAttempt(draftId: string, env: NodeJS.ProcessEnv = {}): Promise<CliOutput> {
    return runOpen(draftId, env);
  }

  return { createBrowserHarness, runOpen, runOpenAttempt, writeUploadedDraft };
}

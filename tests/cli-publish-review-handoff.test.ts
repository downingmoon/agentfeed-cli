import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { draftUploadPayloadHash } from '../src/api/client.js';
import {
  installFailingReviewUrlHandoff,
  installFakeBrowserOpener,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';
import {
  assignCachedUpload,
  closeServer,
  listen,
  parseDraftId,
  publishServer,
  startUploadPreflightServer,
  writeOpenReviewSession
} from './cli-publish-review-handoff-helpers.js';

const fixture = usePublishJsonFixture();

describe('publish CLI review URL handoff policy', () => {
  it('opens the review URL after publish when project config enables it', async () => {
    const server = publishServer({
      id: 'worklog_auto_open',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_auto_open/review',
      createdAt: '2026-05-30T00:00:00.000Z'
    });
    const apiBaseUrl = await listen(server);

    try {
      const sessionFile = await writeOpenReviewSession(fixture);
      const collect = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'collect',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all'
      ], { cwd: fixture.dir(), encoding: 'utf8', env: { ...process.env, HOME: fixture.home() } });
      const draftId = parseDraftId(collect.stdout);
      const fakeBin = join(fixture.dir(), '.agentfeed', 'fake-bin');
      const browserLog = await installFakeBrowserOpener(fakeBin);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draftId, '--yes'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          CI: '0',
          GITHUB_ACTIONS: '0',
          AGENTFEED_CI: '0'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      expect(publish.stdout).toContain('Handoff');
      expect(publish.stdout).toContain('Review URL opened in browser.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_auto_open/review\n');
    } finally {
      await closeServer(server);
    }
  });

  it('does not auto-open review URLs in CI unless explicitly requested', async () => {
    const preflight = await startUploadPreflightServer();
    const draft = fixture.createDraft();
    assignCachedUpload(draft, {
      worklogId: 'worklog_ci_no_open',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_ci_no_open/review',
      uploadedAt: '2026-05-31T00:00:00.000Z',
      payloadHash: draftUploadPayloadHash(draft),
      apiBaseUrl: preflight.apiBaseUrl
    });
    await fixture.writeDraftFile(draft);
    const fakeBin = join(fixture.dir(), '.agentfeed', 'fake-ci-bin');
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await preflight.close();
    }
  });

  it('lets users explicitly suppress configured review auto-open during publish', async () => {
    const server = publishServer({
      id: 'worklog_no_open_flag',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_no_open_flag/review',
      createdAt: '2026-06-03T00:00:00.000Z'
    });
    const apiBaseUrl = await listen(server);

    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'No open flag';
      await fixture.writeDraftFile(draft);
      const fakeBin = join(fixture.dir(), '.agentfeed', 'fake-no-open-bin');
      const browserLog = await installFakeBrowserOpener(fakeBin);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--yes', '--no-open-review'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          CI: '0',
          GITHUB_ACTIONS: '0',
          AGENTFEED_CI: '0'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await closeServer(server);
    }
  });

  it('prints visible warnings when publish review URL handoff fails in human output', async () => {
    const server = publishServer({
      id: 'worklog_publish_failed_handoff',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_publish_failed_handoff/review',
      createdAt: '2026-06-01T00:00:00.000Z'
    });
    const apiBaseUrl = await listen(server);
    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-human-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Publish handoff warning';
      draft.worklog.summary = 'Warn when requested handoff fails';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--yes', '--open-review'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl
        }
      });

      expect(publish.stdout).toContain('Warning: Review URL was not copied to clipboard.');
      expect(publish.stdout).toContain('Warning: Review URL could not be opened automatically.');
      expect(publish.stdout).toContain('Manual review URL:');
      expect(publish.stdout).toContain('  http://localhost:3001/worklogs/worklog_publish_failed_handoff/review');
      expect(publish.stdout).not.toContain('upload.review_url');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await closeServer(server);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { useOpenReviewFixture } from './cli-open-review-helpers.js';

const fixture = useOpenReviewFixture();

describe('agentfeed open review URL rejection and fallback', () => {
  it('refuses unsafe cached review URLs before invoking the browser opener', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_existing',
      reviewUrl: 'https://evil.example/worklogs/worklog_existing/review',
      uploadedAt: '2026-05-30T00:00:00.000Z',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const run = fixture.runOpenAttempt(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
    });

    await expect(run).rejects.toMatchObject({ code: 1 });
    await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('prints a structured manual review URL fallback when the browser cannot be opened', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_manual_open',
      reviewUrl: 'https://agentfeed.downingmoon.dev/worklogs/worklog_manual_open/review',
    });

    const open = await fixture.runOpen(draft.id, {
      AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1',
      AGENTFEED_TEST_BROWSER_LOG: '',
    });

    expect(open.stdout).toContain('AgentFeed review URL');
    expect(open.stdout).toContain('Browser open failed. Open this URL manually:');
    expect(open.stdout).toContain('Summary');
    expect(open.stdout).toContain(`Draft: ${draft.id}`);
    expect(open.stdout).toContain('Review URL:');
    expect(open.stdout).toContain('https://agentfeed.downingmoon.dev/worklogs/worklog_manual_open/review');
    expect(open.stdout).toContain('Next');
    expect(open.stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(open.stdout).toContain('agentfeed status');
  });

  it('rejects saved review URLs when neither stored upload base nor current config trusts them', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_untrusted_stored_base',
      reviewUrl: 'https://review.internal.example/worklogs/worklog_untrusted_stored_base/review',
      apiBaseUrl: 'https://api.internal.example/v1',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = fixture.runOpenAttempt(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'https://api.other.example/v1',
      AGENTFEED_REVIEW_BASE_URL: '',
    });

    await expect(open).rejects.toMatchObject({ code: 1 });
    await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects split-host review URLs when no explicit review frontend origin is configured', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_split_host_no_env',
      reviewUrl: 'https://review.internal.example/worklogs/worklog_split_host_no_env/review',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = fixture.runOpenAttempt(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'https://api.internal.example/v1',
      AGENTFEED_REVIEW_BASE_URL: '',
    });

    await expect(open).rejects.toMatchObject({ code: 1 });
    await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each([
    'https://review.internal.example/worklogs/worklog_split_host_bad/review?token=leak',
    'https://review.internal.example/worklogs/worklog_split_host_bad/review#secret',
    'http://review.internal.example/worklogs/worklog_split_host_bad/review',
    'https://review.internal.example.evil.com/worklogs/worklog_split_host_bad/review',
  ])('rejects unsafe split-host review URLs before invoking the browser opener: %s', async reviewUrl => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_split_host_bad',
      reviewUrl,
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = fixture.runOpenAttempt(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'https://api.internal.example/v1',
      AGENTFEED_REVIEW_BASE_URL: 'https://review.internal.example',
    });

    await expect(open).rejects.toMatchObject({ code: 1 });
    await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects fake 127-prefixed local review hostnames before invoking the browser opener', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_fake_local_open',
      reviewUrl: 'http://127.evil.com:3001/worklogs/worklog_fake_local_open/review',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = fixture.runOpenAttempt(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'http://localhost:3001/v1',
    });

    await expect(open).rejects.toMatchObject({ code: 1 });
    await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

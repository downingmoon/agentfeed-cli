import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { cachedUploadBindingForOpenReview, useOpenReviewFixture } from './cli-open-review-helpers.js';

const fixture = useOpenReviewFixture();

describe('agentfeed open review URL trust policy', () => {
  it('opens a trusted AgentFeed review URL from a saved uploaded draft', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_trusted_open',
      reviewUrl: 'https://agentfeed.downingmoon.dev/worklogs/worklog_trusted_open/review',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = await fixture.runOpen(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
    });

    expect(open.stdout).toContain('Opened review URL.');
    expect(open.stdout).toContain('AgentFeed review opened');
    expect(open.stdout).toContain('Summary');
    expect(open.stdout).toContain(`Draft: ${draft.id}`);
    expect(open.stdout).toContain('Review URL:');
    expect(open.stdout).toContain('Next');
    expect(open.stdout).toContain(`agentfeed preview --id ${draft.id}`);
    await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://agentfeed.downingmoon.dev/worklogs/worklog_trusted_open/review\n');
  });

  it('trusts local review URLs for agentfeed open when a local API base is configured', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_local_open',
      reviewUrl: 'http://127.0.0.1:3001/worklogs/worklog_local_open/review',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = await fixture.runOpen(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'http://localhost:3001/v1',
    });

    expect(open.stdout).toContain('Opened review URL.');
    await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://127.0.0.1:3001/worklogs/worklog_local_open/review\n');
  });

  it('trusts the draft upload API base when current API config has changed', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_stored_upload_base',
      reviewUrl: 'https://api.internal.example/worklogs/worklog_stored_upload_base/review',
      apiBaseUrl: 'https://api.internal.example/v1',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = await fixture.runOpen(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'https://api.other.example/v1',
    });

    expect(open.stdout).toContain('Opened review URL.');
    await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://api.internal.example/worklogs/worklog_stored_upload_base/review\n');
  });

  it('opens a split-host review URL when the review frontend origin is explicitly configured', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_split_host_open',
      reviewUrl: 'https://review.internal.example/worklogs/worklog_split_host_open/review',
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = await fixture.runOpen(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'https://api.internal.example/v1',
      AGENTFEED_REVIEW_BASE_URL: 'https://review.internal.example',
    });

    expect(open.stdout).toContain('Opened review URL.');
    await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://review.internal.example/worklogs/worklog_split_host_open/review\n');
  });

  it('opens a split-host review URL when saved upload metadata contains the review frontend origin', async () => {
    const draft = await fixture.writeUploadedDraft({
      worklogId: 'worklog_split_host_saved_metadata',
      reviewUrl: 'https://review.internal.example/worklogs/worklog_split_host_saved_metadata/review',
      reviewBaseUrl: 'https://review.internal.example',
      uploadedAt: '2026-05-19T00:00:00Z',
      ...cachedUploadBindingForOpenReview('https://api.internal.example/v1'),
    });
    const { binDir, browserLog } = await fixture.createBrowserHarness();

    const open = await fixture.runOpen(draft.id, {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      AGENTFEED_TEST_BROWSER_LOG: browserLog,
      AGENTFEED_TOKEN: 'af_live_test_token',
      AGENTFEED_API_BASE_URL: 'https://api.other.example/v1',
    });

    expect(open.stdout).toContain('Opened review URL.');
    await expect(readFile(browserLog, 'utf8')).resolves.toBe('https://review.internal.example/worklogs/worklog_split_host_saved_metadata/review\n');
  });
});

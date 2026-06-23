import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cachedUploadForPublishCache,
  startPublishUploadPreflightServer,
  usePublishCacheFixture,
} from './cli-publish-cache-helpers.js';

const fixture = usePublishCacheFixture();

describe('agentfeed publish reusable cached upload', () => {
  it('skips forced confirmation only when the cached upload is reusable for the current payload and credentials', async () => {
    const preflight = await startPublishUploadPreflightServer();

    try {
      const draft = fixture.createDraft();
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_reusable_cli_cache',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_reusable_cli_cache/review',
        apiBaseUrl: preflight.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      const publish = await fixture.runPublish(['--id', draft.id], {
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
        AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
        CI: '1',
      });

      expect(publish.stdout).toContain('Private review draft already uploaded; reusing existing review URL.');
      expect(publish.stdout).not.toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('http://localhost:3001/worklogs/worklog_reusable_cli_cache/review');
    } finally {
      await preflight.close();
    }
  });

  it('makes direct publish privacy policy clear for high-severity private review drafts', async () => {
    const preflight = await startPublishUploadPreflightServer();

    try {
      const secret = 'sk-123456789012345678901234';
      const draft = fixture.createDraft();
      draft.worklog.summary = `Manual edit contains ${secret}`;
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_privacy_policy',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_privacy_policy/review',
        apiBaseUrl: preflight.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      const publish = await fixture.runPublish(['--id', draft.id], {
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
        CI: '1',
      });

      expect(publish.stdout).toContain('Private review draft already uploaded; reusing existing review URL.');
      expect(publish.stdout).toContain('Privacy review: required before public publishing.');
      expect(publish.stdout).toContain('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');
      expect(publish.stdout).toContain('Private review upload is allowed so you can resolve findings in the web review.');
      const saved = await readFile(join(fixture.dir(), '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8');
      expect(saved).not.toContain(secret);
    } finally {
      await preflight.close();
    }
  });
});

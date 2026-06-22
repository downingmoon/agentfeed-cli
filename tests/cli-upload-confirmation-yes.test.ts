import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  installFakeBrowserOpener,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';
import {
  closeServer,
  listen,
  uploadCountingServer,
} from './cli-upload-confirmation-helpers.js';

const fixture = usePublishJsonFixture();

describe('CLI confirmed upload execution', () => {
  it('allows --yes to bypass the interactive publish confirmation gate', async () => {
    const counter = uploadCountingServer({ success: true });
    const apiBaseUrl = await listen(counter.server);
    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-publish-confirmed-bin-'));
    const browserLog = await installFakeBrowserOpener(fakeBin);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Confirmed publish';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--yes', '--no-clipboard'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_confirmation_confirmed',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
          AGENTFEED_CI: '1',
          CI: '0'
        }
      });

      expect(publish.stdout).toContain('Private review draft uploaded.');
      expect(publish.stdout).toContain('AgentFeed upload complete');
      expect(publish.stdout).toContain('Summary');
      expect(publish.stdout).toContain(`Draft: ${draft.id}`);
      expect(publish.stdout).toContain('Status: needs_review');
      expect(publish.stdout).toContain('Review URL:');
      expect(publish.stdout).toContain('http://localhost:3001/worklogs/worklog_publish_confirmed/review');
      expect(publish.stdout).toContain('Next');
      expect(publish.stdout).toContain('Recommended order:');
      expect(publish.stdout).toContain(`  1. agentfeed open --id ${draft.id}`);
      expect(publish.stdout).toContain(`  2. agentfeed preview --id ${draft.id}`);
      expect(publish.stdout).not.toContain('Handoff');
      expect(counter.count()).toBe(1);
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await closeServer(counter.server);
    }
  });
});

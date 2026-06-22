import { describe, expect, it } from 'vitest';
import {
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';
import {
  closeServer,
  listen,
  uploadCountingServer,
  writeCodexShareSession,
} from './cli-upload-confirmation-helpers.js';

const fixture = usePublishJsonFixture();

describe('CLI upload confirmation gates', () => {
  it('requires explicit confirmation before interactive share uploads', async () => {
    const counter = uploadCountingServer();
    const apiBaseUrl = await listen(counter.server);
    try {
      const sessionFile = await writeCodexShareSession(fixture.dir(), 'share-confirmation-required', 'gpt-confirm-share', 'confirmShare');
      const share = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          AGENTFEED_TOKEN: 'af_live_confirmation_required',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1'
        }
      });

      expect(share.stdout).toContain('AgentFeed upload paused');
      expect(share.stdout).toContain('Upload confirmation required.');
      expect(share.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(share.stdout).toContain('Summary');
      expect(share.stdout).toContain('Review before upload');
      expect(share.stdout).toContain('Preview: agentfeed preview --id');
      expect(share.stdout).toContain('Target: private AgentFeed review draft');
      expect(share.stdout).toContain('Safety: no upload happens until you rerun with --yes.');
      expect(share.stdout).toContain('Next');
      expect(share.stdout).toContain('Upload after reviewing this draft:');
      expect(share.stdout).toContain('agentfeed publish --id');
      expect(share.stdout).toContain('--yes');
      expect(counter.count()).toBe(0);
    } finally {
      await closeServer(counter.server);
    }
  });

  it('requires explicit confirmation before direct interactive publish uploads', async () => {
    const counter = uploadCountingServer();
    const apiBaseUrl = await listen(counter.server);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Confirmation gated publish';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          AGENTFEED_TOKEN: 'af_live_confirmation_required',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1'
        }
      });

      expect(publish.stdout).toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(publish.stdout).toContain('Review before upload');
      expect(publish.stdout).toContain(`Preview: agentfeed preview --id ${draft.id}`);
      expect(publish.stdout).toContain('Privacy: no findings detected');
      expect(publish.stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
      expect(counter.count()).toBe(0);
    } finally {
      await closeServer(counter.server);
    }
  });

  it('requires explicit upload intent before fresh human-readable publish uploads even in CI', async () => {
    const counter = uploadCountingServer();
    const apiBaseUrl = await listen(counter.server);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'CI confirmation gated publish';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          AGENTFEED_TOKEN: 'af_live_confirmation_required',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(publish.stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
      expect(counter.count()).toBe(0);
    } finally {
      await closeServer(counter.server);
    }
  });
});

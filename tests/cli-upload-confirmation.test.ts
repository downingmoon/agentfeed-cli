import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handlePublishJsonUploadPreflight,
  installFakeBrowserOpener,
  readPublishJsonUploadRequestBody,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';

const fixture = usePublishJsonFixture();

async function writeCodexShareSession(sessionId: string, model: string, exportName: string): Promise<string> {
  const dir = fixture.dir();
  const sessionFile = join(dir, '.agentfeed', `${sessionId}.jsonl`);
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-31T00:00:00Z', type: 'session_meta', payload: { id: sessionId, cwd: dir, model } }),
    JSON.stringify({ timestamp: '2026-05-31T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 31 } } } }),
    JSON.stringify({ timestamp: '2026-05-31T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: `--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const ${exportName} = true;\n` }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(dir, 'src', 'api.ts'), `export const ok = true;\nexport const ${exportName} = true;\n`);
  return sessionFile;
}

function uploadCountingServer(options: { readonly success?: boolean } = {}) {
  let ingestRequestCount = 0;
  const server = createServer(async (req, res) => {
    if (handlePublishJsonUploadPreflight(req, res)) return;
    if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
      res.writeHead(404).end();
      return;
    }
    ingestRequestCount += 1;
    if (options.success === true) {
      await readPublishJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_publish_confirmed',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_confirmed/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: {} }));
  });
  return {
    count: () => ingestRequestCount,
    server
  };
}

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return `http://127.0.0.1:${address.port}/v1`;
}

describe('CLI upload confirmation gates', () => {
  it('requires explicit confirmation before interactive share uploads', async () => {
    const counter = uploadCountingServer();
    const apiBaseUrl = await listen(counter.server);
    try {
      const sessionFile = await writeCodexShareSession('share-confirmation-required', 'gpt-confirm-share', 'confirmShare');
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
      await new Promise<void>((resolve) => counter.server.close(() => resolve()));
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
      await new Promise<void>((resolve) => counter.server.close(() => resolve()));
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
      await new Promise<void>((resolve) => counter.server.close(() => resolve()));
    }
  });

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
      await new Promise<void>((resolve) => counter.server.close(() => resolve()));
    }
  });
});

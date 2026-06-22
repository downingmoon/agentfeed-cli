import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCollectionState } from '../src/config/collection-state.js';
import {
  handleShareJsonUploadPreflight,
  installFakeBrowserOpener,
  installFakeClipboard,
  readShareJsonUploadRequestBody,
  useShareJsonUploadFixture,
  writeCodexShareSession,
} from './cli-share-json-upload-helpers.js';

const fixture = useShareJsonUploadFixture();

describe('share CLI JSON upload failure side effects', () => {
  it('does not copy or open review URLs when share JSON upload fails', async () => {
    const server = createServer(async (req, res) => {
      if (handleShareJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readShareJsonUploadRequestBody(req);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'boom', details: {} } }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-side-effects-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-failed-side-effects', 'gpt-share-json-failed', 'jsonFailedSideEffects');
      const run = fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--clipboard',
        '--open-review'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      await expect(run).rejects.toMatchObject({ code: 1 });
      await expect(readFile(clipboardLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readCollectionState(fixture.dir())).resolves.toEqual({});
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

});

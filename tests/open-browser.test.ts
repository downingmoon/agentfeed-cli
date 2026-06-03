import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.hoisted(() => vi.fn());
const osMock = vi.hoisted(() => ({
  platform: vi.fn(() => 'darwin'),
  release: vi.fn(() => '')
}));

vi.mock('node:child_process', () => ({ spawn: spawnMock }));
vi.mock('node:os', () => ({ platform: osMock.platform, release: osMock.release }));

const { openBrowser } = await import('../src/utils/open-browser.js');

const originalDisableRealBrowser = process.env.AGENTFEED_TEST_DISABLE_REAL_BROWSER;
const originalTestBrowserLog = process.env.AGENTFEED_TEST_BROWSER_LOG;

function mockChild() {
  const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
  child.unref = vi.fn();
  spawnMock.mockReturnValue(child);
  return child;
}

describe('openBrowser', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    osMock.platform.mockReturnValue('darwin');
    osMock.release.mockReturnValue('');
    process.env.AGENTFEED_TEST_DISABLE_REAL_BROWSER = originalDisableRealBrowser ?? '1';
    process.env.AGENTFEED_TEST_BROWSER_LOG = originalTestBrowserLog ?? '/tmp/agentfeed-open-browser-test.log';
  });

  it('does not keep the CLI process alive while the browser opener is running', async () => {
    const child = mockChild();

    const opened = openBrowser('http://localhost:3001/cli/authorize?session_id=test');

    expect(child.unref).toHaveBeenCalled();
    child.emit('close', 0);

    await expect(opened).resolves.toBe(true);
  });

  it('refuses to launch a real browser during Vitest child processes unless a test opener is installed', async () => {
    process.env.AGENTFEED_TEST_DISABLE_REAL_BROWSER = '1';
    delete process.env.AGENTFEED_TEST_BROWSER_LOG;

    await expect(openBrowser('http://localhost:3001/worklogs/worklog_publish_confirmed/review')).resolves.toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });


  it('refuses to launch a real browser from Vitest child-process environments unless a test opener is installed', async () => {
    delete process.env.AGENTFEED_TEST_DISABLE_REAL_BROWSER;
    delete process.env.AGENTFEED_TEST_BROWSER_LOG;
    process.env.VITEST_WORKER_ID = '1';
    try {
      await expect(openBrowser('http://localhost:3001/worklogs/worklog_publish_confirmed/review')).resolves.toBe(false);
      expect(spawnMock).not.toHaveBeenCalled();
    } finally {
      delete process.env.VITEST_WORKER_ID;
    }
  });

  it('times out a stuck browser opener instead of hanging login forever', async () => {
    vi.useFakeTimers();
    try {
      const child = mockChild();

      const opened = openBrowser('http://localhost:3001/cli/authorize?session_id=stuck', { timeoutMs: 10 });
      await vi.advanceTimersByTimeAsync(10);

      await expect(opened).resolves.toBe(false);
      expect(child.unref).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });


  it('scrubs sensitive environment variables from browser helper processes', async () => {
    const oldToken = process.env.AGENTFEED_TOKEN;
    const oldNpmToken = process.env.NPM_TOKEN;
    process.env.AGENTFEED_TOKEN = 'af_live_secret_should_not_reach_browser';
    process.env.NPM_TOKEN = 'npm_secret_should_not_reach_browser';
    try {
      const child = mockChild();

      const opened = openBrowser('https://agentfeed.dev/worklogs/worklog_secret/review');

      const options = spawnMock.mock.calls[0][2] as { env?: NodeJS.ProcessEnv };
      expect(options.env?.AGENTFEED_TOKEN).toBeUndefined();
      expect(options.env?.NPM_TOKEN).toBeUndefined();
      expect(options.env?.PATH).toBe(process.env.PATH);
      child.emit('close', 0);
      await expect(opened).resolves.toBe(true);
    } finally {
      if (oldToken === undefined) delete process.env.AGENTFEED_TOKEN;
      else process.env.AGENTFEED_TOKEN = oldToken;
      if (oldNpmToken === undefined) delete process.env.NPM_TOKEN;
      else process.env.NPM_TOKEN = oldNpmToken;
    }
  });

  it('uses native Windows shell opener instead of xdg-open on win32', async () => {
    osMock.platform.mockReturnValue('win32');
    const child = mockChild();
    const url = 'https://agentfeed.dev/worklogs/worklog_windows/review';

    const opened = openBrowser(url);

    expect(spawnMock).toHaveBeenCalledWith('cmd', ['/c', 'start', '', url], expect.objectContaining({ stdio: 'ignore' }));
    expect(child.unref).toHaveBeenCalled();
    child.emit('close', 0);
    await expect(opened).resolves.toBe(true);
  });

  it('uses wslview on Linux under WSL', async () => {
    osMock.platform.mockReturnValue('linux');
    osMock.release.mockReturnValue('5.15.90.1-microsoft-standard-WSL2');
    const child = mockChild();
    const url = 'https://agentfeed.dev/worklogs/worklog_wsl/review';

    const opened = openBrowser(url);

    expect(spawnMock).toHaveBeenCalledWith('wslview', [url], expect.objectContaining({ stdio: 'ignore' }));
    expect(child.unref).toHaveBeenCalled();
    child.emit('close', 0);
    await expect(opened).resolves.toBe(true);
  });
});

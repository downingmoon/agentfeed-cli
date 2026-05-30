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
  });

  it('does not keep the CLI process alive while the browser opener is running', async () => {
    const child = mockChild();

    const opened = openBrowser('http://localhost:3001/cli/authorize?session_id=test');

    expect(child.unref).toHaveBeenCalled();
    child.emit('close', 0);

    await expect(opened).resolves.toBe(true);
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

  it('uses native Windows shell opener instead of xdg-open on win32', async () => {
    osMock.platform.mockReturnValue('win32');
    const child = mockChild();
    const url = 'https://agentfeed.dev/worklogs/worklog_windows/review';

    const opened = openBrowser(url);

    expect(spawnMock).toHaveBeenCalledWith('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
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

    expect(spawnMock).toHaveBeenCalledWith('wslview', [url], { stdio: 'ignore' });
    expect(child.unref).toHaveBeenCalled();
    child.emit('close', 0);
    await expect(opened).resolves.toBe(true);
  });
});

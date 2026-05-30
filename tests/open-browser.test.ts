import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ spawn: spawnMock }));
vi.mock('node:os', () => ({ platform: () => 'darwin', release: () => '' }));

const { openBrowser } = await import('../src/utils/open-browser.js');

describe('openBrowser', () => {
  it('does not keep the CLI process alive while the browser opener is running', async () => {
    const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
    child.unref = vi.fn();
    spawnMock.mockReturnValue(child);

    const opened = openBrowser('http://localhost:3001/cli/authorize?session_id=test');

    expect(child.unref).toHaveBeenCalled();
    child.emit('close', 0);

    await expect(opened).resolves.toBe(true);
  });

  it('times out a stuck browser opener instead of hanging login forever', async () => {
    vi.useFakeTimers();
    try {
      const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
      child.unref = vi.fn();
      spawnMock.mockReturnValue(child);

      const opened = openBrowser('http://localhost:3001/cli/authorize?session_id=stuck', { timeoutMs: 10 });
      await vi.advanceTimersByTimeAsync(10);

      await expect(opened).resolves.toBe(false);
      expect(child.unref).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

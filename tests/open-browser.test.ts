import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ spawn: spawnMock }));
vi.mock('node:os', () => ({ platform: () => 'darwin', release: () => '' }));

const { openBrowser } = await import('../src/utils/open-browser.js');

describe('openBrowser', () => {
  it('keeps the CLI process alive until the browser opener reports close', async () => {
    const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
    child.unref = vi.fn();
    spawnMock.mockReturnValue(child);

    const opened = openBrowser('http://localhost:3001/cli/authorize?session_id=test');

    expect(child.unref).not.toHaveBeenCalled();
    child.emit('close', 0);

    await expect(opened).resolves.toBe(true);
  });
});

import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.hoisted(() => vi.fn());
const platformMock = vi.hoisted(() => vi.fn(() => 'darwin'));
const releaseMock = vi.hoisted(() => vi.fn(() => ''));

vi.mock('node:child_process', () => ({ spawn: spawnMock }));
vi.mock('node:os', () => ({ platform: platformMock, release: releaseMock }));

const { copyToClipboard } = await import('../src/utils/clipboard.js');

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & { stdin: { end: ReturnType<typeof vi.fn> } };
  child.stdin = { end: vi.fn() };
  return child;
}

describe('clipboard', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    platformMock.mockReturnValue('darwin');
    releaseMock.mockReturnValue('');
  });

  it('copies text using the platform clipboard command', async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const copied = copyToClipboard('https://agentfeed.dev/review/1');
    child.emit('close', 0);

    await expect(copied).resolves.toBe(true);
    expect(spawnMock).toHaveBeenCalledWith('pbcopy', [], expect.objectContaining({ stdio: ['pipe', 'ignore', 'ignore'] }));
    expect(child.stdin.end).toHaveBeenCalledWith('https://agentfeed.dev/review/1');
  });

  it('fails gracefully when clipboard command is unavailable', async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const copied = copyToClipboard('https://agentfeed.dev/review/1');
    child.emit('error', new Error('missing'));

    await expect(copied).resolves.toBe(false);
  });

  it('falls back across common Linux clipboard commands', async () => {
    platformMock.mockReturnValue('linux');

    const xclip = fakeChild();
    const wlCopy = fakeChild();
    spawnMock
      .mockReturnValueOnce(xclip)
      .mockReturnValueOnce(wlCopy);

    const copied = copyToClipboard('https://agentfeed.dev/review/1');
    xclip.emit('error', new Error('missing xclip'));
    await new Promise((resolve) => setImmediate(resolve));
    wlCopy.emit('close', 0);

    await expect(copied).resolves.toBe(true);
    expect(spawnMock).toHaveBeenNthCalledWith(1, 'xclip', ['-selection', 'clipboard'], expect.objectContaining({ stdio: ['pipe', 'ignore', 'ignore'] }));
    expect(spawnMock).toHaveBeenNthCalledWith(2, 'wl-copy', [], expect.objectContaining({ stdio: ['pipe', 'ignore', 'ignore'] }));
    expect(xclip.stdin.end).toHaveBeenCalledWith('https://agentfeed.dev/review/1');
    expect(wlCopy.stdin.end).toHaveBeenCalledWith('https://agentfeed.dev/review/1');
  });
});

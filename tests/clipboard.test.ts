import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ spawn: spawnMock }));
vi.mock('node:os', () => ({ platform: () => 'darwin', release: () => '' }));

const { copyToClipboard } = await import('../src/utils/clipboard.js');

describe('clipboard', () => {
  it('copies text using the platform clipboard command', async () => {
    const child = new EventEmitter() as EventEmitter & { stdin: { end: ReturnType<typeof vi.fn> } };
    child.stdin = { end: vi.fn() };
    spawnMock.mockReturnValue(child);

    const copied = copyToClipboard('https://agentfeed.dev/review/1');
    child.emit('close', 0);

    await expect(copied).resolves.toBe(true);
    expect(spawnMock).toHaveBeenCalledWith('pbcopy', [], expect.objectContaining({ stdio: ['pipe', 'ignore', 'ignore'] }));
    expect(child.stdin.end).toHaveBeenCalledWith('https://agentfeed.dev/review/1');
  });

  it('fails gracefully when clipboard command is unavailable', async () => {
    const child = new EventEmitter() as EventEmitter & { stdin: { end: ReturnType<typeof vi.fn> } };
    child.stdin = { end: vi.fn() };
    spawnMock.mockReturnValue(child);

    const copied = copyToClipboard('https://agentfeed.dev/review/1');
    child.emit('error', new Error('missing'));

    await expect(copied).resolves.toBe(false);
  });
});

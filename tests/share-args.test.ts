import { describe, expect, it } from 'vitest';
import { option } from '../src/cli/args.js';
import { parseShareArgs } from '../src/cli/share.js';

describe('share command argument parsing', () => {
  it('parses share-specific options and preserves collect source options', () => {
    expect(parseShareArgs(['--dry', '--open-review', '--source', 'antigravity-cli', '--session-file=/tmp/session.jsonl', '--since', '2026-05-20T01:00:00Z', '--until=2026-05-20T02:00:00Z', '--note', 'Refined login flow', '--no-clipboard', '--no-save-cursor', '--run-configured-commands'])).toEqual({
      dryRun: true,
      openReview: true,
      noOpenReview: false,
      json: false,
      explain: false,
      source: 'gemini_cli',
      sessionFile: '/tmp/session.jsonl',
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      note: 'Refined login flow',
      noClipboard: true,
      noSaveCursor: true,
      runConfiguredCommands: true,
      yes: false
    });
    expect(parseShareArgs(['--explain']).explain).toBe(true);
    expect(parseShareArgs(['--yes']).yes).toBe(true);
    expect(parseShareArgs(['--no-open-review']).noOpenReview).toBe(true);
  });

  it('accepts Antigravity CLI aliases as the supported Gemini-family source values', () => {
    expect(parseShareArgs(['--source', 'antigravity-cli']).source).toBe('gemini_cli');
    expect(parseShareArgs(['--source', 'agy']).source).toBe('gemini_cli');
  });

  it('rejects missing option values before treating flags as values', () => {
    expect(() => option(['--token', '--no-save'], '--token')).toThrow(/--token requires a value/);
    expect(() => option(['--source='], '--source')).toThrow(/--source requires a value/);
    expect(() => parseShareArgs(['--source', '--json'])).toThrow(/--source requires a value/);
  });

  it('rejects unsupported share source values before creating drafts', () => {
    expect(() => parseShareArgs(['--source', 'gemni-cli'])).toThrow(/Unsupported agent source: gemni-cli[\s\S]*Tip: omit --source to let AgentFeed auto-detect Claude\/Codex\/Cursor\/Antigravity sessions\.[\s\S]*Did you mean: --source antigravity-cli[\s\S]*Run: agentfeed share --dry[\s\S]*Run: agentfeed share --source antigravity-cli --dry[\s\S]*Run: agentfeed share --help/i);
  });
});

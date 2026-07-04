import { describe, expect, it } from 'vitest';
import {
  parseJsonObject,
  useCollectCommandUxFixture
} from './cli-collect-command-ux-helpers.js';

const fixture = useCollectCommandUxFixture();

describe('collect command session-file diagnostics', () => {
  it('rejects explicit session-file misses before creating a draft', async () => {
    await fixture.writeSource('export const ok = "missing-session-warning";\n');

    const failure = await fixture.runCollectExpectingFailure([
      '--source',
      'codex',
      '--session-file',
      'missing-codex-session.jsonl',
      '--all',
      '--no-save-cursor'
    ]);

    expect(failure.stderr ?? '').toContain('Agent session file was not found: missing-codex-session.jsonl');
    expect(failure.stderr ?? '').toContain('without --session-file to use auto-discovery');
    await fixture.expectDraftsEmpty();
  });

  it('rejects explicit session-file parse misses before creating a draft', async () => {
    await fixture.writeProjectFile('codex-session.jsonl', 'not-json\n');

    const failure = await fixture.runCollectExpectingFailure([
      '--source',
      'codex',
      '--session-file',
      'codex-session.jsonl',
      '--json',
      '--all',
      '--no-save-cursor'
    ]);

    const output = parseJsonObject(failure.stdout ?? '{}');
    expect(output.error).toEqual(expect.objectContaining({
      message: expect.stringContaining('Agent session file did not produce usable metrics: codex-session.jsonl')
    }));
    expect(output.error).toEqual(expect.objectContaining({
      message: expect.stringContaining('outside the collection window, unrelated to this project, or unsupported for the selected source')
    }));
    await fixture.expectDraftsEmpty();
  });
});

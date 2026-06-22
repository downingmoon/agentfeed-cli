import { describe, expect, it } from 'vitest';
import {
  parseJsonObject,
  stringArrayField,
  useCollectCommandUxFixture
} from './cli-collect-command-ux-helpers.js';

const fixture = useCollectCommandUxFixture();

describe('collect command session-file diagnostics', () => {
  it('surfaces explicit session-file misses in human collect output', async () => {
    await fixture.writeSource('export const ok = "missing-session-warning";\n');

    const { stdout, stderr } = await fixture.runCollect([
      '--source',
      'codex',
      '--session-file',
      'missing-codex-session.jsonl',
      '--all',
      '--no-save-cursor'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('Warnings');
    expect(stdout).toContain('Agent session file was not found: missing-codex-session.jsonl');
    expect(stdout).toContain('without --session-file to use auto-discovery');
  });

  it('surfaces explicit session-file parse misses in JSON collect output', async () => {
    await fixture.writeProjectFile('codex-session.jsonl', 'not-json\n');

    const { stdout, stderr } = await fixture.runCollect([
      '--source',
      'codex',
      '--session-file',
      'codex-session.jsonl',
      '--json',
      '--all',
      '--no-save-cursor'
    ]);

    expect(stderr).toBe('');
    const output = parseJsonObject(stdout);
    const warnings = stringArrayField(output.warnings).join('\n');
    expect(warnings).toContain('Agent session file did not produce usable metrics: codex-session.jsonl');
    expect(warnings).toContain('outside the collection window, unrelated to this project, or unsupported for the selected source');
  });
});

import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  isRecord,
  parseCollectErrorOutput,
  useCollectConfigStateFixture,
} from './cli-collect-config-state-helpers.js';

const fixture = useCollectConfigStateFixture();

describe('collect malformed config failure handling', () => {
  it('fails malformed project config with actionable recovery guidance', async () => {
    await writeFile(join(fixture.dir(), '.agentfeed', 'config.json'), '{not-json');

    const failure = await fixture.runCollectExpectingFailure(['--json']);
    const output = parseCollectErrorOutput(failure.stdout);
    expect(output.error.message).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(output.error.message).toContain('Re-run agentfeed init or restore the file from backup');
    expect(output.error.message).not.toContain('Unexpected token');
    expect(failure.stderr ?? '').toBe('');
  });

  it('fails malformed project config shape before creating a draft', async () => {
    const configPath = join(fixture.dir(), '.agentfeed', 'config.json');
    const rawConfig: unknown = JSON.parse(await readFile(configPath, 'utf8'));
    if (!isRecord(rawConfig) || !isRecord(rawConfig.project)) throw new Error('expected initialized project config');
    rawConfig.project.tags = 'not-an-array';
    await writeFile(configPath, JSON.stringify(rawConfig, null, 2));

    const failure = await fixture.runCollectExpectingFailure(['--json']);
    const output = parseCollectErrorOutput(failure.stdout);
    expect(output.error.message).toContain('AgentFeed config is invalid');
    expect(output.error.message).toContain('project.tags must be an array of strings');
    expect(output.error.message).toContain('Re-run agentfeed init or restore the file from backup');
    expect(output.error.message).not.toContain('TypeError');
    expect(failure.stderr ?? '').toBe('');
  });
});

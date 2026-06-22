import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  countDraftJsonFiles,
  parseCollectDraftOutput,
  parseCollectErrorOutput,
  useCollectJsonUploadFixture,
} from './cli-collect-json-upload-helpers.js';

const fixture = useCollectJsonUploadFixture();

describe('collect JSON auth handling', () => {
  it('prints parseable collect JSON without human UX headings or ANSI styling', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = "json-clean";\n');

    const result = await fixture.runCollect(['--json', '--all', '--no-save-cursor'], {
      ...process.env,
      HOME: fixture.home()
    });

    const draft = parseCollectDraftOutput(result.stdout);
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
    expect(result.stdout).not.toContain('\u001b[');
    expect(result.stdout).not.toMatch(/(^|\n)(AgentFeed draft|Summary|Signals|Collection|Next|ID:|Preview:|Upload:)/);
  });

  it('guides login before collect JSON upload when no token is configured', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = "json-upload-needs-login";\n');

    const failure = await fixture.runCollectExpectingFailure(['--json', '--upload', '--all', '--no-save-cursor'], {
      ...process.env,
      HOME: fixture.home(),
      AGENTFEED_TOKEN: '',
      AGENTFEED_API_BASE_URL: undefined,
      AGENTFEED_ALLOW_INSECURE_API: undefined
    });
    const output = parseCollectErrorOutput(failure.stdout);
    expect(output.error.message).toContain('AgentFeed token is missing.');
    expect(output.next_actions).toEqual([
      'agentfeed login',
      'printf %s "$TOKEN" | agentfeed login --token-stdin'
    ]);
    expect(failure.stderr ?? '').toBe('');
    await expect(countDraftJsonFiles(fixture.dir())).resolves.toBe(0);
  });

  it('guides login before human collect upload without creating a draft', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = "human-upload-needs-login";\n');

    const failure = await fixture.runCollectExpectingFailure(['--upload', '--all', '--no-save-cursor'], {
      ...process.env,
      HOME: fixture.home(),
      AGENTFEED_TOKEN: '',
      AGENTFEED_API_BASE_URL: undefined,
      AGENTFEED_ALLOW_INSECURE_API: undefined
    });
    expect(failure.stdout ?? '').toBe('');
    expect(failure.stderr ?? '').toContain('AgentFeed token is missing.');
    expect(failure.stderr ?? '').toContain('Run: agentfeed login');
    expect(failure.stderr ?? '').toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
    await expect(countDraftJsonFiles(fixture.dir())).resolves.toBe(0);
  });
});

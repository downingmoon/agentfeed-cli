import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { useShareGuidanceFixture } from './cli-share-guidance-helpers.js';

const fixture = useShareGuidanceFixture();

describe('share CLI dry-run and JSON output', () => {
  it('prints polished human-readable dry-run share preview sections and publish guidance', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\nexport const shareDryPreview = true;\n');

    const { stdout, stderr } = await fixture.runCli([
      'share',
      '--dry',
      '--all'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed share preview');
    expect(stdout).toContain('Ready to share private review draft.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Signals');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Target');
    expect(stdout).toContain('Upload target: private AgentFeed review draft');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Dry run complete. Local draft kept:');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed preview --id');
    expect(stdout).toContain('agentfeed login');
    expect(stdout).toContain('agentfeed publish --id');
    expect(stdout).toContain('agentfeed preview --id');
    expect(stdout.indexOf('agentfeed preview --id')).toBeLessThan(stdout.indexOf('agentfeed publish --id'));
    expect(stdout.indexOf('agentfeed login')).toBeLessThan(stdout.indexOf('agentfeed publish --id'));
  });

  it('accepts share --dry --explain as the explainable daily workflow', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\nexport const shareDryExplain = true;\n');

    const { stdout, stderr } = await fixture.runCli([
      'share',
      '--dry',
      '--all',
      '--explain'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed share preview');
    expect(stdout).toContain('Collection details');
    expect(stdout).toContain('Collection details: shown below');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Sources:');
    expect((stdout.match(/Collection guidance:/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(stdout).toContain('Dry run complete. Local draft kept:');
    expect(stdout).toContain('agentfeed login');
    expect(stdout).toContain('agentfeed publish --id');
    expect(stdout).not.toContain('Unknown option: --explain');
  });

  it('does not ask users to login again in share dry-run guidance when credentials exist', async () => {
    await mkdir(join(fixture.home(), '.agentfeed'), { recursive: true });
    await writeFile(join(fixture.home(), '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_share_dry_guidance',
      created_at: '2026-06-06T00:00:00.000Z'
    }));
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\nexport const shareDryWithToken = true;\n');

    const { stdout, stderr } = await fixture.runCli([
      'share',
      '--dry',
      '--all'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('Dry run complete. Local draft kept:');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed preview --id');
    expect(stdout).toContain('agentfeed publish --id');
    expect(stdout).not.toContain('agentfeed login');
    expect(stdout).not.toContain('af_live_share_dry_guidance');
  });

  it('prints parseable share JSON without human UX headings or ANSI styling', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\nexport const shareJsonPreview = true;\n');

    const { stdout, stderr } = await fixture.runCli([
      'share',
      '--json',
      '--dry-run',
      '--all'
    ]);

    const output = JSON.parse(stdout) as { dry_run?: boolean; draft?: { id?: string }; next_actions?: string[] };
    const draftId = output.draft?.id;
    expect(stderr).toBe('');
    expect(output.dry_run).toBe(true);
    expect(draftId).toMatch(/^draft_/);
    expect(output.next_actions).toEqual([
      `agentfeed preview --id ${draftId}`,
      'agentfeed login',
      `agentfeed publish --id ${draftId} --yes`
    ]);
    expect(stdout).not.toContain('\u001b[');
    expect(stdout).not.toMatch(/(^|\n)(AgentFeed share preview|Ready to share private review draft|Summary|Collection quality|Next|Publish later)/);
  });

  it('prints parseable share JSON upload-skipped guidance when token is missing', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const shareJsonNoToken = true;\n');

    const { stdout, stderr } = await fixture.runCli([
      'share',
      '--json',
      '--yes',
      '--all'
    ]);

    const output = JSON.parse(stdout) as {
      dry_run?: boolean;
      upload_skipped?: { reason?: string; next_action?: string } | null;
      draft?: { id?: string };
      next_actions?: string[];
    };
    const draftId = output.draft?.id;
    expect(stderr).toBe('');
    expect(output.dry_run).toBe(false);
    expect(output.upload_skipped).toEqual({ reason: 'token_missing', next_action: 'agentfeed login' });
    expect(draftId).toMatch(/^draft_/);
    expect(output.next_actions).toEqual([
      `agentfeed preview --id ${draftId}`,
      'agentfeed login',
      `agentfeed publish --id ${draftId} --yes`
    ]);
    expect(stdout).not.toContain('AgentFeed token is missing.');
    expect(stdout).not.toContain('[');
  });

});

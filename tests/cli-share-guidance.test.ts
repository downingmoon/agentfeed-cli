import { describe, expect, it } from 'vitest';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { useShareGuidanceFixture } from './cli-share-guidance-helpers.js';

const fixture = useShareGuidanceFixture();

describe('share CLI guidance and recovery output', () => {
  it('guides project initialization before login when share upload runs outside an initialized project', async () => {
    await rm(join(fixture.dir(), '.agentfeed'), { recursive: true, force: true });

    const failure = await fixture.runCliFailure(['share', '--yes']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed project is not initialized.');
    expect(failure.stderr).toContain('Setup');
    expect(failure.stderr).toContain('Run: agentfeed init');
    expect(failure.stderr).toContain('Then try');
    expect(failure.stderr).toContain('Run: agentfeed status');
    expect(failure.stderr).toContain('Run: agentfeed share --dry');
    expect(failure.stderr).not.toContain('Run: agentfeed init --no-git-check');
    expect(failure.stderr).not.toContain('AgentFeed token is missing.');

    const publish = await fixture.runCliFailure(['publish', '--latest', '--yes']);
    expect(publish.stdout).toBe('');
    expect(publish.stderr).toContain('AgentFeed project is not initialized.');
    expect(publish.stderr).toContain('Setup');
    expect(publish.stderr).toContain('Run: agentfeed init');
    expect(publish.stderr).toContain('Then try');
    expect(publish.stderr).toContain('Run: agentfeed status');
    expect(publish.stderr).not.toContain('No local drafts found.');
    expect(publish.stderr).not.toContain('AgentFeed token is missing.');
  });

  it('guides draft creation before login when publishing with no local drafts', async () => {
    const latest = await fixture.runCliFailure(['publish', '--latest', '--yes']);
    expect(latest.stdout).toBe('');
    expect(latest.stderr).toContain('No local drafts found.');
    expect(latest.stderr).toContain('Create a draft:');
    expect(latest.stderr).toContain('Run: agentfeed collect --explain');
    expect(latest.stderr).toContain('Run: agentfeed share --dry');
    expect(latest.stderr).toContain('Inspect saved drafts:');
    expect(latest.stderr).toContain('Run: agentfeed drafts');
    expect(latest.stderr).not.toContain('AgentFeed token is missing.');

    const missingId = await fixture.runCliFailure(['publish', '--id', 'draft_missing', '--yes']);
    expect(missingId.stdout).toBe('');
    expect(missingId.stderr).toContain('Draft not found: draft_missing');
    expect(missingId.stderr).toContain('Inspect saved drafts:');
    expect(missingId.stderr).toContain('Run: agentfeed drafts');
    expect(missingId.stderr).toContain('Create a fresh draft:');
    expect(missingId.stderr).toContain('Run: agentfeed collect --explain');
    expect(missingId.stderr).not.toContain('AgentFeed token is missing.');
  });

  it('fails malformed project config with actionable recovery before share dry-run', async () => {
    await writeFile(join(fixture.dir(), '.agentfeed', 'config.json'), '{not-json');

    const failure = await fixture.runCliFailure(['share', '--dry', '--all']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed config is unreadable or invalid JSON');
    expect(failure.stderr).toContain('Re-run agentfeed init or restore the file from backup');
    expect(failure.stderr).not.toContain('Unexpected token');
  });

  it('fails malformed project config shape before share dry-run collection', async () => {
    const configPath = join(fixture.dir(), '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = 'not-an-array';
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const failure = await fixture.runCliFailure(['share', '--dry', '--all']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed config is invalid');
    expect(failure.stderr).toContain('project.tags must be an array of strings');
    expect(failure.stderr).toContain('Re-run agentfeed init or restore the file from backup');
    expect(failure.stderr).not.toContain('TypeError');
  });

  it('keeps share useful without a token and guides login before upload', async () => {
    const share = await fixture.runCli(['share', '--yes', '--all'], { FORCE_COLOR: undefined });
    expect(share.stderr).toBe('');
    expect(share.stdout).toContain('AgentFeed share preview');
    expect(share.stdout).toContain('Upload skipped: AgentFeed token is missing. Local draft kept:');
    expect(share.stdout).toContain('Recommended order:');
    expect(share.stdout).toContain('agentfeed preview --id');
    expect(share.stdout).toContain('agentfeed login');
    expect(share.stdout).toContain('agentfeed publish --id');

    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: fixture.dir(), source: 'codex' });
    draft.worklog.title = 'Publish needs login';
    await writeDraft(fixture.dir(), draft);

    const publish = await fixture.runCliFailure(['publish', '--id', draft.id, '--yes']);
    expect(publish.stdout).toBe('');
    expect(publish.stderr).toContain('AgentFeed token is missing.');
    expect(publish.stderr).toContain('Run: agentfeed login');
    expect(publish.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
  });

});

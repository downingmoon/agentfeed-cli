import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { scanSecret, useCliScanFixture } from './cli-scan-helpers.js';

const fixture = useCliScanFixture();

describe('scan CLI command JSON output', () => {
  it('keeps scan JSON machine-readable without human UX headings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: fixture.dir(), source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${scanSecret}`;
    await writeDraft(fixture.dir(), draft);

    const stdout = fixture.runScan([
      '--id',
      draft.id,
      '--dry-run',
      '--json'
    ]);

    const output = JSON.parse(stdout) as { dry_run?: boolean; scan?: { status?: string }; next_actions?: string[] };
    expect(output.dry_run).toBe(true);
    expect(output.scan?.status).toBe('danger');
    expect(output.next_actions).toEqual([`agentfeed scan --id ${draft.id}`]);
    expect(stdout).not.toContain('AgentFeed privacy scan');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });

  it('prints machine-readable saved scan results with next actions', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: fixture.dir(), source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${scanSecret}`;
    await writeDraft(fixture.dir(), draft);

    const stdout = fixture.runScan([
      '--id',
      draft.id,
      '--json'
    ]);

    const output = JSON.parse(stdout) as {
      dry_run?: boolean;
      mode?: string;
      target?: { type?: string; id?: string };
      saved?: boolean;
      scan?: { status?: string };
      redacted_fields?: Array<{ field?: string; value?: string }>;
      next_actions?: string[];
    };
    const saved = JSON.parse(await readFile(fixture.draftPath(draft.id), 'utf8'));

    expect(output).toMatchObject({
      dry_run: false,
      mode: 'redact_and_save',
      target: { type: 'draft', id: draft.id },
      saved: true
    });
    expect(output.scan?.status).toBe('danger');
    expect(output.redacted_fields).toEqual([{ field: 'summary', value: 'Deploy with [REDACTED_SECRET]' }]);
    expect(output.next_actions).toEqual([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
    expect(saved.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
    expect(stdout).not.toContain('AgentFeed privacy scan');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });

  it('prints machine-readable path scan guidance without pretending a draft was saved', () => {
    const stdout = fixture.runScan([
      '--path',
      fixture.dir(),
      '--json'
    ]);

    const output = JSON.parse(stdout) as {
      dry_run?: boolean;
      mode?: string;
      target?: { type?: string; path?: string };
      saved?: boolean;
      scan?: { status?: string };
      next_actions?: string[];
    };

    expect(output).toMatchObject({
      dry_run: false,
      mode: 'inspect_only',
      target: { type: 'path', path: fixture.dir() },
      saved: false
    });
    expect(output.scan?.status).toBe('safe');
    expect(output.next_actions).toEqual(['agentfeed collect --explain']);
    expect(stdout).not.toContain('AgentFeed privacy scan');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });
});

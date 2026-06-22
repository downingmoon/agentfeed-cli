import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';
import { readDraft } from '../src/draft/read.js';
import type { LocalDraft } from '../src/types.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-git-validation-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'one\ntwo\nthree\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

type DraftMutationCase = {
  readonly name: string;
  readonly mutate: (draft: LocalDraft) => unknown;
  readonly expected: RegExp;
};

describe('git draft runtime validation', () => {
  it('round-trips valid local drafts through runtime validation', async () => {
    await initProject({ cwd: dir, projectName: 'Draft Guard', noGitCheck: false });
    const draft = await collectDraft({ cwd: dir, source: 'codex' });

    const loaded = await readDraft(dir, draft.id);

    expect(loaded).toMatchObject({ id: draft.id, schema_version: '0.2', upload: { uploaded: false } });
    expect(loaded.privacy_scan.findings).toEqual(draft.privacy_scan.findings);
  });

  it('accepts backend-supported privacy severity values in local draft validation', async () => {
    await initProject({ cwd: dir, projectName: 'Draft Guard', noGitCheck: false });
    const draft = await collectDraft({ cwd: dir, source: 'codex' });
    const draftPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json`);

    for (const severity of ['info', 'low', 'medium', 'high', 'critical', 'unknown'] as const) {
      const mutated = {
        ...draft,
        privacy_scan: {
          status: severity === 'high' || severity === 'critical' ? 'danger' : 'warning',
          findings: [{
            id: `finding-${severity}`,
            type: 'possible_secret',
            severity,
            message: `Backend-supported ${severity} privacy severity`,
            field: 'worklog.summary',
            resolved: false,
          }],
        },
      };
      await writeFile(draftPath, JSON.stringify(mutated, null, 2));
      const loaded = await readDraft(dir, draft.id);
      expect(loaded.privacy_scan.findings[0]?.severity).toBe(severity);
    }
  });

  it('rejects corrupted local draft shapes with actionable field guidance', async () => {
    await initProject({ cwd: dir, projectName: 'Draft Guard', noGitCheck: false });
    const draft = await collectDraft({ cwd: dir, source: 'codex' });
    const draftPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json`);

    const cases: readonly DraftMutationCase[] = [
      { name: 'missing worklog', mutate: (value) => ({ ...value, worklog: undefined }), expected: /AgentFeed draft is invalid.*worklog must be an object.*agentfeed collect/is },
      { name: 'missing upload', mutate: (value) => ({ ...value, upload: undefined }), expected: /AgentFeed draft is invalid.*upload must be an object.*agentfeed collect/is },
      { name: 'invalid findings', mutate: (value) => ({ ...value, privacy_scan: { status: 'safe', findings: { id: 'not-array' } } }), expected: /AgentFeed draft is invalid.*privacy_scan\.findings must be an array.*agentfeed collect/is },
      { name: 'invalid privacy severity', mutate: (value) => ({ ...value, privacy_scan: { status: 'warning', findings: [{ id: 'finding-1', type: 'possible_secret', severity: 'blocker', message: 'Invalid severity', resolved: false }] } }), expected: /AgentFeed draft is invalid.*privacy_scan\.findings\[0\]\.severity has an unsupported value.*agentfeed collect/is },
      { name: 'invalid source created_at', mutate: (value) => ({ ...value, source: { ...value.source, created_at: 'not-a-date' } }), expected: /AgentFeed draft is invalid.*source\.created_at must be a valid timestamp.*agentfeed collect/is },
      { name: 'invalid collection window since', mutate: (value) => ({ ...value, source: { ...value.source, collection_window: { since: 'not-a-date', until: '2026-06-01T00:00:00.000Z' } } }), expected: /AgentFeed draft is invalid.*source\.collection_window\.since must be a valid timestamp or null.*agentfeed collect/is },
      { name: 'invalid upload uploaded_at', mutate: (value) => ({ ...value, upload: { ...value.upload, uploaded_at: 'not-a-date' } }), expected: /AgentFeed draft is invalid.*upload\.uploaded_at must be a valid timestamp or null.*agentfeed collect/is },
      { name: 'negative aggregate metric', mutate: (value) => ({ ...value, worklog: { ...value.worklog, metrics: { ...value.worklog.metrics, tokens_used: -1 } } }), expected: /AgentFeed draft is invalid.*worklog\.metrics\.tokens_used must be a non-negative number or null.*agentfeed collect/is },
      { name: 'negative agent metric', mutate: (value) => ({ ...value, worklog: { ...value.worklog, metrics: { ...value.worklog.metrics, agent_metrics: [{ agent: 'codex', tokens_used: -1 }] } } }), expected: /AgentFeed draft is invalid.*worklog\.metrics\.agent_metrics\[0\]\.tokens_used must be a non-negative number or null.*agentfeed collect/is },
      { name: 'negative timeline order', mutate: (value) => ({ ...value, worklog: { ...value.worklog, timeline: [{ order: -1, title: 'Invalid negative order' }] } }), expected: /AgentFeed draft is invalid.*worklog\.timeline\[0\]\.order must be a non-negative integer.*agentfeed collect/is },
    ];

    for (const testCase of cases) {
      await writeFile(draftPath, JSON.stringify(testCase.mutate(draft), null, 2));
      await expect(readDraft(dir, draft.id), testCase.name).rejects.toThrow(testCase.expected);
    }
  });
});

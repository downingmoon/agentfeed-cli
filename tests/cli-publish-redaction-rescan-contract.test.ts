import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;

function recordField(value: unknown, field: string): unknown {
  return typeof value === 'object' && value !== null && field in value
    ? value[field as keyof typeof value]
    : undefined;
}

function arrayField(value: unknown, field: string): readonly unknown[] {
  const fieldValue = recordField(value, field);
  return Array.isArray(fieldValue) ? fieldValue : [];
}

function hasOwnField(value: unknown, field: string): boolean {
  return typeof value === 'object' && value !== null && Object.hasOwn(value, field);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-publish-redaction-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  process.env.HOME = oldHome;
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('CLI publish redaction re-scan contract', () => {
  it('re-scans manually edited draft fields before upload and persists redactions', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'Deploy with sk-abcdefghijklmnopqrstuvwxyz1234567890';
    draft.worklog.public_prompt = 'Use ghp_abcdefghijklmnopqrstuvwxyz1234567890 carefully';
    draft.project.repository_url = 'http://localhost:3000/private-repo';
    await writeDraft(dir, draft);
    let ingestPayload: unknown = null;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      ingestPayload = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ data: { id: 'worklog_redacted', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_redacted/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    const ingestWorklog = recordField(ingestPayload, 'worklog');
    const ingestProject = recordField(ingestPayload, 'project');
    const ingestPrivacyScan = recordField(ingestPayload, 'privacy_scan');
    expect(recordField(ingestWorklog, 'summary')).toBe('Deploy with [REDACTED_SECRET]');
    expect(recordField(ingestWorklog, 'public_prompt')).toBe('Use [REDACTED_SECRET] carefully');
    expect(recordField(ingestProject, 'repository_url')).toBeNull();
    expect(recordField(ingestPrivacyScan, 'status')).toBe('danger');
    expect(arrayField(ingestPrivacyScan, 'findings').length).toBeGreaterThan(0);
    expect(arrayField(ingestPrivacyScan, 'findings').some((finding) => hasOwnField(finding, 'sample_redacted'))).toBe(false);

    const saved: unknown = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    const savedWorklog = recordField(saved, 'worklog');
    const savedProject = recordField(saved, 'project');
    const savedPrivacyScan = recordField(saved, 'privacy_scan');
    expect(arrayField(savedPrivacyScan, 'findings').some((finding) => hasOwnField(finding, 'sample_redacted'))).toBe(true);
    expect(recordField(savedWorklog, 'summary')).toBe('Deploy with [REDACTED_SECRET]');
    expect(recordField(savedWorklog, 'public_prompt')).toBe('Use [REDACTED_SECRET] carefully');
    expect(recordField(savedProject, 'repository_url')).toBe('[REDACTED_URL]');
    expect(recordField(savedPrivacyScan, 'status')).toBe('danger');
  });
});

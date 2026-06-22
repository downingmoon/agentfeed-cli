import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { draftToIngestRequest } from '../src/api/client.js';

const projectRoot = '/tmp/agentfeed-ingest-payload-project';

describe('CLI ingest payload contract', () => {
  it('preserves collection window and fingerprint in ingest source payload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot, source: 'codex' });
    draft.source.host_label = 'Downing MacBook';
    draft.source.session_id = 'raw-agent-session-id';
    draft.source.collection_window = {
      since: '2026-05-24T00:00:00.000Z',
      until: '2026-05-24T00:10:00.000Z'
    };
    draft.source.collection_window_reason = 'idle_gap';
    draft.source.collection_fingerprint = 'agentfeed-window-fingerprint';

    const payload = draftToIngestRequest(draft);

    expect(payload.source.collection_window).toEqual(draft.source.collection_window);
    expect(payload.source.collection_window_reason).toBe('idle_gap');
    expect(payload.source.collection_fingerprint).toBe('agentfeed-window-fingerprint');
    expect(payload.source.host_label).toBeUndefined();
    expect(payload.source.session_id).not.toBe('raw-agent-session-id');
    expect(payload.source.session_id).toMatch(/^session_[a-f0-9]{16}$/);
    expect(payload.source.local_draft_id).not.toBe(draft.id);
    expect(payload.source.local_draft_id).toMatch(/^draft_[a-f0-9]{16}$/);
  });

  it('strips credentials from repository URLs before upload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot, source: 'codex' });
    draft.project.repository_url = 'https://oauth2:secret-token@gitlab.example/group/repo.git';

    const payload = draftToIngestRequest(draft);

    expect(payload.project.repository_url).toBe('https://gitlab.example/group/repo.git');
    expect(JSON.stringify(payload)).not.toContain('secret-token');
  });

  it.each([
    'ssh://deploy:secret-token@git.example/group/repo.git',
    'git@github.com:org/private.git'
  ])('omits non-HTTP repository remotes before upload: %s', (remote) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot, source: 'codex' });
    draft.project.repository_url = remote;

    const payload = draftToIngestRequest(draft);

    expect(payload.project.repository_url).toBeNull();
    expect(JSON.stringify(payload)).not.toContain('secret-token');
    expect(JSON.stringify(payload)).not.toContain('git@github.com');
  });

  it('includes the collected model in the ingest worklog payload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot, source: 'codex' });
    draft.worklog.model = 'gpt-5.5';
    draft.worklog.metrics.models_used = ['claude-sonnet', 'gpt-5.5'];
    draft.worklog.metrics.agent_metrics = [
      { agent: 'claude_code', model: 'claude-sonnet', session_id: 'claude-session', tokens_used: 15, files_changed: 1, lines_added: 1, tool_calls: 1 },
      { agent: 'codex', model: 'gpt-5.5', session_id: 'codex-session', tokens_used: 240, files_changed: 1, lines_added: 2, tool_calls: 2 }
    ];

    const payload = draftToIngestRequest(draft);

    expect(payload.worklog.model).toBe('gpt-5.5');
    expect(payload.worklog.metrics.models_used).toEqual(['claude-sonnet', 'gpt-5.5']);
    expect(payload.worklog.metrics.agent_metrics).toEqual([
      expect.objectContaining({ agent: 'claude_code', model: 'claude-sonnet', tokens_used: 15, tool_calls: 1 }),
      expect.objectContaining({ agent: 'codex', model: 'gpt-5.5', tokens_used: 240, tool_calls: 2 })
    ]);
  });

  it('redacts uploaded string metadata outside the summary fields', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot, source: 'codex' });
    const secret = 'sk-123456789012345678901234';
    draft.worklog.model = `model-${secret}`;
    draft.worklog.metrics.models_used = [`gpt-${secret}`];
    draft.worklog.metrics.agent_metrics = [{ agent: 'codex', model: `agent-model-${secret}`, session_id: `session-${secret}`, tokens_used: 1 }];
    draft.worklog.metrics.agent_modes = [`agent-mode-${secret}`];

    const payload = draftToIngestRequest(draft);

    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload.worklog.model).toBe('model-[REDACTED_SECRET]');
    expect(payload.worklog.metrics.models_used).toEqual(['gpt-[REDACTED_SECRET]']);
    expect(payload.worklog.metrics.agent_metrics?.[0]?.model).toBe('agent-model-[REDACTED_SECRET]');
    expect(payload.worklog.metrics.agent_metrics?.[0]?.session_id).toBe('session-[REDACTED_SECRET]');
    expect(payload.worklog.metrics.agent_modes).toEqual(['agent-mode-[REDACTED_SECRET]']);
  });

  it('sends share notes as user_note instead of folding them into generated summaries', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot, source: 'codex' });
    draft.worklog.summary = 'Generated machine summary.';
    draft.worklog.user_note = 'Human review context.';

    const payload = draftToIngestRequest(draft);

    expect(payload.worklog.summary).toBe('Generated machine summary.');
    expect(payload.worklog.user_note).toBe('Human review context.');
  });
});

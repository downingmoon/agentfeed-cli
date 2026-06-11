import type { IngestWorklogRequest, LocalDraft } from '../types.js';
import { sanitizedDraftForUpload } from '../privacy/draft-sanitizer.js';
import { repositoryUrlForUpload } from '../privacy/url.js';
import { shortHash } from '../utils/hash.js';

export function draftToIngestRequest(draft: LocalDraft): IngestWorklogRequest {
  const safeDraft = sanitizedDraftForUpload(draft);
  const source: IngestWorklogRequest['source'] = {
    agent: safeDraft.source.agent,
    tool_version: safeDraft.source.tool_version,
    local_draft_id: `draft_${shortHash(`draft:${safeDraft.id}`, 16)}`,
    collection_window: safeDraft.source.collection_window ?? null,
    collection_window_reason: safeDraft.source.collection_window_reason ?? null,
    collection_fingerprint: safeDraft.source.collection_fingerprint ?? null
  };
  if (safeDraft.source.session_id) source.session_id = `session_${shortHash(`session:${safeDraft.source.session_id}`, 16)}`;
  return {
    source,
    project: {
      name: safeDraft.project.name,
      repository_url: repositoryUrlForUpload(safeDraft.project.repository_url),
      local_path_hash: safeDraft.project.local_path_hash
    },
    worklog: {
      title: safeDraft.worklog.title,
      summary: safeDraft.worklog.summary,
      user_note: safeDraft.worklog.user_note ?? null,
      model: safeDraft.worklog.model ?? null,
      category: safeDraft.worklog.category,
      tags: safeDraft.worklog.tags,
      metrics: safeDraft.worklog.metrics,
      changed_areas: safeDraft.worklog.changed_areas,
      public_prompt: safeDraft.worklog.public_prompt ?? null,
      outcome: safeDraft.worklog.outcome,
      timeline: safeDraft.worklog.timeline
    },
    privacy_scan: safeDraft.privacy_scan
  };
}

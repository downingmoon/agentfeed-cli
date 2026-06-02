export type AgentType = 'claude_code' | 'codex' | 'cursor' | 'gemini_cli' | 'other';
export type Visibility = 'private' | 'unlisted' | 'public' | 'team';
export type WorklogStatus = 'draft' | 'needs_review' | 'private' | 'unlisted' | 'public' | 'rejected' | 'deleted';
export type WorklogCategory = 'web_app' | 'bot' | 'automation' | 'trading' | 'devops' | 'data' | 'ai_tool' | 'open_source' | 'other';
export type PrivacyStatus = 'safe' | 'warning' | 'danger';
export type PrivacySeverity = 'low' | 'medium' | 'high';
export type CollectionQuality = 'high' | 'medium' | 'low';
export type CollectionSourceType = 'agent_session' | 'plugin_metadata' | 'generic_metadata';
export type CollectionWindowReason = 'idle_gap';

export interface CollectionSource {
  type: CollectionSourceType;
  name: string;
  quality: CollectionQuality;
}

export interface AgentFeedProjectConfig {
  version: '0.2';
  project: {
    name: string;
    slug: string;
    repository_url?: string | null;
    visibility: 'private' | 'unlisted' | 'public';
    tags: string[];
  };
  collection: {
    auto_collect: boolean;
    auto_upload: boolean;
    open_review_after_upload: boolean;
    include_public_prompt: boolean;
    include_estimated_cost: boolean;
    include_token_usage: boolean;
    include_file_stats: boolean;
    include_test_results: boolean;
    run_tests_on_collect: boolean;
  };
  privacy: {
    redact_secrets: boolean;
    redact_emails: boolean;
    redact_private_urls: boolean;
    redact_local_paths: boolean;
    block_public_publish_on_high_severity: boolean;
    raw_transcript_upload: boolean;
    raw_diff_upload: boolean;
  };
  agents: {
    claude_code: { enabled: boolean; hook_scope: 'project' | 'global' };
    codex: { enabled: boolean };
    cursor: { enabled: boolean };
    gemini_cli: { enabled: boolean };
  };
  commands: { test: 'auto' | string | null; build: 'auto' | string | null };
}

export interface AgentFeedCredentials {
  api_base_url: string;
  ingestion_token: string;
  token_id?: string | null;
  token_expires_at?: string | null;
  user?: { id?: string; username?: string | null; display_name?: string | null };
  created_at: string;
}

export interface CliAuthSession {
  session_id: string;
  authorize_url: string;
  user_code: string;
  expires_at: string;
  poll_interval_seconds: number;
}

export interface CliAuthExchangeResult {
  token: string;
  token_id?: string;
  token_expires_at?: string | null;
  rotated_from?: string;
  rotated_at?: string;
  user?: { id?: string; username?: string | null; display_name?: string | null };
}

export interface WorklogMetrics {
  tokens_used?: number | null;
  estimated_cost_usd?: number | null;
  duration_seconds?: number | null;
  files_changed?: number | null;
  lines_added?: number | null;
  lines_removed?: number | null;
  tests_run?: number | null;
  tests_passed?: number | null;
  commits_created?: number | null;
  failed_commands?: number | null;
  commands_run?: number | null;
  tool_calls?: number | null;
  skills_used?: number | null;
  subagents_spawned?: number | null;
  subagents_completed?: number | null;
  agent_turns?: number | null;
  agent_modes?: string[] | null;
  collection_quality?: CollectionQuality | null;
  collection_sources?: CollectionSource[] | null;
}

export interface WorklogTimelineItem {
  order: number;
  title: string;
  description?: string;
  status?: 'success' | 'warning' | 'failed' | 'info';
}

export interface PrivacyScanResult {
  status: PrivacyStatus;
  findings: PrivacyFinding[];
}

export interface PrivacyFinding {
  id: string;
  type: 'possible_secret' | 'private_url' | 'email_address' | 'api_key_pattern' | 'env_file_reference' | 'sensitive_path' | 'database_url' | 'other';
  severity: PrivacySeverity;
  message: string;
  field?: string;
  sample_redacted?: string;
  resolved: boolean;
  resolution?: 'ignored' | 'redacted' | 'removed';
}

export interface CollectionWindow {
  since?: string | null;
  until?: string | null;
}

export interface ReviewUrlHandoffChannel {
  requested: boolean;
  ok: boolean | null;
  warning?: string;
}

export interface ReviewUrlHandoff {
  clipboard: ReviewUrlHandoffChannel;
  browser: ReviewUrlHandoffChannel;
}

export interface LocalDraft {
  schema_version: '0.2';
  id: string;
  project: { name: string; repository_url?: string | null; local_path_hash?: string };
  worklog: {
    title: string;
    summary: string;
    user_note?: string | null;
    agent: AgentType;
    model?: string | null;
    category: WorklogCategory;
    tags: string[];
    visibility: 'private';
    metrics: WorklogMetrics;
    changed_areas: string[];
    public_prompt?: string | null;
    outcome: string[];
    timeline: WorklogTimelineItem[];
  };
  privacy_scan: PrivacyScanResult;
  source: { agent: AgentType; session_id?: string | null; tool_version: string; host_label?: string | null; created_at: string; collection_window?: CollectionWindow | null; collection_window_reason?: CollectionWindowReason | null; collection_fingerprint?: string | null };
  upload: {
    uploaded: boolean;
    worklog_id?: string | null;
    review_url?: string | null;
    uploaded_at?: string | null;
    payload_hash?: string | null;
    api_base_url?: string | null;
    credential_binding_hash?: string | null;
    token_id?: string | null;
    user_id?: string | null;
    handoff?: ReviewUrlHandoff | null;
  };
}

export interface ChangedFileSummary {
  path: string;
  extension?: string | null;
  language?: string | null;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'unknown';
  lines_added?: number | null;
  lines_removed?: number | null;
  publish_path: boolean;
}

export interface GitMetrics {
  repository_url?: string | null;
  branch?: string | null;
  head_commit?: string | null;
  dirty: boolean;
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  changed_files: ChangedFileSummary[];
}

export interface IngestWorklogRequest {
  source: {
    agent: AgentType;
    tool_version: string;
    host_label?: string | null;
    session_id?: string | null;
    local_draft_id?: string;
    collection_window?: CollectionWindow | null;
    collection_window_reason?: CollectionWindowReason | null;
    collection_fingerprint?: string | null;
  };
  project: { name: string; repository_url?: string | null; local_path_hash?: string };
  worklog: {
    title: string;
    summary: string;
    user_note?: string | null;
    model?: string | null;
    category: WorklogCategory;
    tags: string[];
    metrics: WorklogMetrics;
    changed_areas: string[];
    public_prompt?: string | null;
    outcome: string[];
    timeline: WorklogTimelineItem[];
  };
  privacy_scan: PrivacyScanResult;
}

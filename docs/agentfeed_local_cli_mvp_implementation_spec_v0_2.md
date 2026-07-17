# AgentFeed Local CLI MVP Implementation Spec v0.2

> [!IMPORTANT]
> This is a historical MVP implementation spec, not the current AgentFeed CLI source of truth.
> Current CLI behavior uses browser login or stdin-based token input. Literal
> `agentfeed login --token <token>` argv input is disabled by default because it can
> leak secrets through shell history/process listings.

## 0. Purpose of This Document

This document is a **self-contained implementation specification** for building the AgentFeed local CLI MVP.

An AI coding agent should be able to implement the AgentFeed local CLI MVP using **only this document**.

The AgentFeed backend API is assumed to already exist and follow the API contract summarized in this document.

Do not assume access to separate frontend or backend specification documents.

---

# 1. Product Context

## 1.1 What AgentFeed Is

AgentFeed is a public activity feed for AI-assisted development.

It turns local AI coding agent sessions, such as Claude Code sessions, into **public-safe worklog drafts** that users can review and publish on the AgentFeed website.

The core product idea:

```text
Tokscale = how much AI you used
AgentFeed = what you built with AI
```

## 1.2 What This CLI Does

The local CLI collects metadata about an AI coding session and creates a structured worklog draft.

It must:

```text
1. Initialize a local AgentFeed project.
2. Connect to the AgentFeed API using an ingestion token.
3. Collect local session information.
4. Collect Git-based code change metrics.
5. Parse Claude Code session metadata when explicitly requested.
6. Scan generated public fields for privacy risks.
7. Create a local draft JSON file.
8. Preview the draft locally.
9. Upload the draft to the AgentFeed backend.
10. Open or print the backend review URL.
```

## 1.3 What This CLI Must Not Do

The CLI must not:

```text
- Upload raw code diff by default.
- Upload raw agent transcript by default.
- Upload .env contents.
- Auto-publish public worklogs.
- Upload secrets.
- Require a paid LLM API key to work.
- Block the user's AI coding session if collection fails.
```

All uploads must create private, reviewable worklog drafts on the server.

---

# 2. MVP Scope

## 2.1 MVP Must Implement

The MVP must implement these commands:

```bash
agentfeed init
agentfeed login
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin
agentfeed status
agentfeed collect
agentfeed preview
agentfeed publish
agentfeed scan
agentfeed doctor
```

## 2.2 MVP Should Implement If Easy

```bash
agentfeed drafts
agentfeed discard
agentfeed open
```

## 2.3 MVP Excludes

```text
- Full OAuth login flow
- Billing
- Team features
- Browser extension
- Cursor integration
- Codex integration
- Antigravity CLI integration
- Raw transcript upload
- Raw diff upload
- Automatic test execution by default
- LLM-assisted summary generation by default
```

## 2.4 MVP Primary Agent

MVP supports:

```text
Claude Code
```

Other agents can be represented as:

```text
other
```

---

# 3. Implementation Stack

## 3.1 Recommended Stack

Use TypeScript + Node.js.

Recommended package setup:

```text
Runtime: Node.js >= 20
Language: TypeScript
Package manager: pnpm or npm
CLI parser: commander or cac
Schema validation: zod
HTTP client: fetch or undici
Test runner: vitest
Formatter/linter: biome or eslint/prettier
```

## 3.2 Package Name

```text
agentfeed
```

## 3.3 Executable

The installed binary must be:

```bash
agentfeed
```

`package.json` should expose:

```json
{
  "bin": {
    "agentfeed": "./dist/cli/index.js"
  }
}
```

---

# 4. Local Directory Structure

## 4.1 Project-local Directory

Each project initialized with AgentFeed must contain:

```text
.agentfeed/
├── config.json
├── redaction-rules.json
├── drafts/
├── logs/
├── cache/
└── backups/
```

## 4.2 Global Directory

The CLI must use this global directory:

```text
~/.agentfeed/
├── credentials.json
├── config.json
├── logs/
└── cache/
```

## 4.3 Draft Files

Drafts are stored as:

```text
.agentfeed/drafts/{draft_id}.json
.agentfeed/drafts/{draft_id}.md
```

The JSON file is authoritative.  
The Markdown file is for human preview/editing only.

---

# 5. Config Files

## 5.1 Project Config

Path:

```text
.agentfeed/config.json
```

Schema:

```ts
interface AgentFeedProjectConfig {
  version: "0.2";
  project: {
    name: string;
    slug: string;
    repository_url?: string;
    visibility: "private" | "unlisted" | "public";
    tags: string[];
  };
  collection: {
    auto_collect: boolean;
    auto_upload: boolean; // legacy/deprecated: collect ignores this unless --upload is passed
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
    claude_code: {
      enabled: boolean;
    };
    codex: {
      enabled: boolean;
    };
    cursor: {
      enabled: boolean;
    };
    gemini_cli: {
      enabled: boolean;
    };
  };
  commands: {
    test: "auto" | string | null;
    build: "auto" | string | null;
  };
}
```

Default config:

```json
{
  "version": "0.2",
  "project": {
    "name": "my-project",
    "slug": "my-project",
    "repository_url": null,
    "visibility": "private",
    "tags": []
  },
  "collection": {
    "auto_collect": true,
    "auto_upload": false,
    "open_review_after_upload": true,
    "include_public_prompt": false,
    "include_estimated_cost": false,
    "include_token_usage": true,
    "include_file_stats": true,
    "include_test_results": true,
    "run_tests_on_collect": false
  },
  "privacy": {
    "redact_secrets": true,
    "redact_emails": true,
    "redact_private_urls": true,
    "redact_local_paths": true,
    "block_public_publish_on_high_severity": true,
    "raw_transcript_upload": false,
    "raw_diff_upload": false
  },
  "agents": {
    "claude_code": {
      "enabled": true
    },
    "codex": {
      "enabled": false
    },
    "cursor": {
      "enabled": false
    },
    "gemini_cli": {
      "enabled": false
    }
  },
  "commands": {
    "test": "auto",
    "build": "auto"
  }
}
```

## 5.2 Global Credentials

Path:

```text
~/.agentfeed/credentials.json
```

Schema:

```ts
interface AgentFeedCredentials {
  api_base_url: string;
  ingestion_token: string;
  user?: {
    id?: string;
    username?: string;
  };
  created_at: string;
}
```

Default API base URL:

```text
https://agentfeed.api.downingmoon.dev/v1
```

Local development override:

```bash
AGENTFEED_API_BASE_URL=http://localhost:8000/v1
```

The environment variable must override config file values.

## 5.3 Credential File Permissions

On Unix-like systems, after writing credentials:

```bash
chmod 600 ~/.agentfeed/credentials.json
```

If chmod fails, warn but do not crash.

---

# 6. Shared Enums

The CLI must use these exact enum values when communicating with the backend.

## 6.1 AgentType

```ts
type AgentType =
  | "claude_code"
  | "codex"
  | "cursor"
  | "gemini_cli"
  | "other";
```

## 6.2 Visibility

```ts
type Visibility = "private" | "unlisted" | "public";
```

MVP/server contract does not support `team`; future team-scoped sharing must be introduced as a new cross-repo contract, not a CLI-only value.

## 6.3 WorklogStatus

```ts
type WorklogStatus =
  | "draft"
  | "needs_review"
  | "private"
  | "unlisted"
  | "public"
  | "rejected"
  | "deleted";
```

## 6.4 WorklogCategory

```ts
type WorklogCategory =
  | "web_app"
  | "bot"
  | "automation"
  | "trading"
  | "devops"
  | "data"
  | "ai_tool"
  | "open_source"
  | "other";
```

## 6.5 Privacy Status

```ts
type PrivacyStatus = "safe" | "warning" | "danger";
```

## 6.6 Privacy Severity

```ts
type PrivacySeverity = "low" | "medium" | "high";
```

---

# 7. Backend API Contract Required by CLI

The backend API is already implemented. The CLI must integrate with the following endpoints.

## 7.1 Upload Worklog

```http
POST /ingest/worklogs
Authorization: Bearer <ingestion_token>
Content-Type: application/json
```

Full URL:

```text
{api_base_url}/ingest/worklogs
```

### Request Payload

```ts
interface IngestWorklogRequest {
  source: {
    agent: AgentType;
    tool_version: string;
    host_label?: string;
    session_id?: string;
    local_draft_id?: string;
  };
  project: {
    name: string;
    repository_url?: string | null;
    local_path_hash?: string;
  };
  worklog: {
    title: string;
    summary: string;
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
```

### Response Payload

```ts
interface IngestWorklogResponse {
  data: {
    id: string;
    status: "needs_review" | "private";
    visibility: "private";
    review_url: string;
    created_at: string;
  };
}
```

## 7.2 Preview Upload Validation

```http
POST /ingest/worklogs/preview
Authorization: Bearer <ingestion_token>
Content-Type: application/json
```

Full URL:

```text
{api_base_url}/ingest/worklogs/preview
```

This endpoint validates an upload payload without saving it.

### Response Payload

```ts
interface IngestPreviewResponse {
  data: {
    valid: boolean;
    preview: {
      title: string;
      summary: string;
      metrics_row: string;
    };
    warnings: string[];
  };
}
```

## 7.3 Expected Error Format

All API errors use:

```ts
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

Important error codes:

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
RATE_LIMITED
INGESTION_TOKEN_INVALID
INGESTION_PAYLOAD_TOO_LARGE
DUPLICATE_INGESTION_SESSION
INTERNAL_SERVER_ERROR
```

## 7.4 Error Handling Rules

The CLI must handle:

```text
401 / INGESTION_TOKEN_INVALID:
  Print login/token guidance.

413 / INGESTION_PAYLOAD_TOO_LARGE:
  Tell user the draft is too large.
  Keep local draft.

422 / VALIDATION_ERROR:
  Print validation details.
  Keep local draft.

429 / RATE_LIMITED:
  Print retry_after_seconds if present.
  Keep local draft.

409 / DUPLICATE_INGESTION_SESSION:
  Print duplicate warning.
  If server returns existing review_url, display it.

5xx:
  Print server error.
  Keep local draft.
```

---

# 8. Core Data Models

## 8.1 WorklogMetrics

```ts
interface WorklogMetrics {
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
}
```

## 8.2 WorklogTimelineItem

```ts
interface WorklogTimelineItem {
  order: number;
  title: string;
  description?: string;
  status?: "success" | "warning" | "failed" | "info";
}
```

## 8.3 PrivacyScanResult

```ts
interface PrivacyScanResult {
  status: "safe" | "warning" | "danger";
  findings: PrivacyFinding[];
}
```

## 8.4 PrivacyFinding

```ts
interface PrivacyFinding {
  id: string;
  type:
    | "possible_secret"
    | "private_url"
    | "email_address"
    | "api_key_pattern"
    | "env_file_reference"
    | "sensitive_path"
    | "database_url"
    | "other";
  severity: "low" | "medium" | "high";
  message: string;
  field?: string;
  sample_redacted?: string;
  resolved: boolean;
  resolution?: "ignored" | "redacted" | "removed";
}
```

## 8.5 LocalDraft

```ts
interface LocalDraft {
  schema_version: "0.2";
  id: string;
  project: {
    name: string;
    repository_url?: string | null;
    local_path_hash?: string;
  };
  worklog: {
    title: string;
    summary: string;
    agent: AgentType;
    model?: string | null;
    category: WorklogCategory;
    tags: string[];
    visibility: "private";
    metrics: WorklogMetrics;
    changed_areas: string[];
    public_prompt?: string | null;
    outcome: string[];
    timeline: WorklogTimelineItem[];
  };
  privacy_scan: PrivacyScanResult;
  source: {
    agent: AgentType;
    session_id?: string | null;
    tool_version: string;
    host_label?: string | null;
    created_at: string;
  };
  upload: {
    uploaded: boolean;
    worklog_id?: string | null;
    review_url?: string | null;
    uploaded_at?: string | null;
  };
}
```

---

# 9. CLI Commands

## 9.1 agentfeed init

### Purpose

Initialize AgentFeed in the current project.

### Usage

```bash
agentfeed init
agentfeed init --project-name "binance-signal-bot"
agentfeed init --private
agentfeed init --no-git-check
```

### Behavior

1. Detect current working directory.
2. Check whether it is inside a Git repository.
3. Create `.agentfeed/`.
4. Create subdirectories: `drafts`, `logs`, `cache`, `backups`.
5. Create `.agentfeed/config.json`.
6. Create `.agentfeed/redaction-rules.json`.
7. Infer project name from option, Git root, or current directory.
8. Infer repository URL with `git remote get-url origin`.
9. Set visibility to `private`.

### Success Output

```text
AgentFeed initialized.

Project: binance-signal-bot
Visibility: private
Config: .agentfeed/config.json

Next:
  agentfeed login
  agentfeed share --dry
```

---

## 9.2 agentfeed login

### Purpose

Store an ingestion token for API upload.

### Usage

```bash
agentfeed login
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin
```

### Behavior

1. Ensure `~/.agentfeed/` exists.
2. Write `~/.agentfeed/credentials.json`.
3. Use `AGENTFEED_API_BASE_URL` if present.
4. Set file permission to 600 if possible.
5. Refuse literal argv tokens unless the local development-only escape hatch
   `AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1` is explicitly set.

### Success Output

```text
AgentFeed credentials saved.

API: https://agentfeed.api.downingmoon.dev/v1
Next:
  agentfeed status
```

---

## 9.3 agentfeed status

### Purpose

Show current local AgentFeed state.

### Usage

```bash
agentfeed status
```

### Output Fields

```text
User/token: configured or missing
API base URL
Project initialized: yes/no
Project name
Git repository: yes/no
Local drafts count
Pending upload count
```

---

## 9.4 agentfeed collect

### Purpose

Collect local metrics and create a local worklog draft.

### Usage

```bash
agentfeed collect
agentfeed collect --source claude-code
agentfeed collect --source claude-code --session-file <path>
agentfeed collect --upload          # terminal review, then prompt before upload
agentfeed collect --upload --yes    # non-interactive upload after collection
agentfeed collect --open-review
agentfeed collect --json
```

### Default Behavior

1. Load project config.
2. Detect source agent.
3. Collect raw session metadata if available.
4. Collect Git metrics.
5. Collect test/build result summaries from parsed session if available.
6. Collect token usage if available.
7. Generate rule-based worklog draft.
8. Run privacy scanner.
9. Write local draft JSON.
10. Write local draft Markdown.
11. Do not upload unless `--upload` is passed. `collection.auto_upload` is kept only for legacy config compatibility and must not trigger upload by itself.

### Required Output

```text
Draft created.

ID: draft_20260519_102000_abcd
Project: binance-signal-bot
Privacy: safe
Metrics: 7 files · +412 -188 · 14 tests · 129K tokens

Preview:
  agentfeed preview --id draft_20260519_102000_abcd

Upload:
  agentfeed publish --id draft_20260519_102000_abcd
```

---

## 9.5 agentfeed preview

### Purpose

Preview a local draft.

### Usage

```bash
agentfeed preview
agentfeed preview --latest
agentfeed preview --id draft_123
agentfeed preview --json
```

If no ID is passed, preview latest draft.

### Terminal Preview Format

```text
┌─────────────────────────────────────────────┐
│ @local · Claude Code · binance-signal-bot    │
│                                             │
│ Improved signal scoring logic                │
│ Refactored fixed threshold logic into        │
│ weighted scoring.                            │
│                                             │
│ 7 files · +412 -188 · 14 tests · 129K tokens │
│                                             │
│ Privacy: safe                                │
└─────────────────────────────────────────────┘

Actions:
  agentfeed publish --id draft_123
  agentfeed scan --id draft_123
```

---

## 9.6 agentfeed publish

### Purpose

Upload a local draft to the AgentFeed backend.

### Usage

```bash
agentfeed publish --id draft_123
agentfeed publish --latest
agentfeed publish --open-review
```

### Behavior

1. Load credentials.
2. Load draft.
3. Convert LocalDraft to IngestWorklogRequest.
4. Call `POST /ingest/worklogs`.
5. Update local draft upload metadata.
6. Print review URL.
7. If `--open-review` is provided or config says true, open review URL in browser.

### Important Policy

`agentfeed publish` uploads the draft to the server as private/needs_review.  
It does **not** publicly publish the worklog.

### Success Output

```text
Worklog uploaded.

Status: needs_review
Review URL:
https://agentfeed.downingmoon.dev/worklogs/worklog_123/review
```

---

## 9.7 agentfeed scan

### Purpose

Run privacy scan on a draft or current project.

### Usage

```bash
agentfeed scan --id draft_123
agentfeed scan --latest
agentfeed scan --path .
agentfeed scan --json
```

### Behavior

For draft scan:

1. Load draft.
2. Scan public fields.
3. Update draft privacy_scan.
4. Print results.

For path scan:

1. Scan filenames only by default.
2. Do not read arbitrary file contents except config/draft files.
3. Warn on sensitive filenames.

---

## 9.8 agentfeed doctor

### Purpose

Diagnose setup issues.

### Usage

```bash
agentfeed doctor
```

### Checks

```text
- Node version
- agentfeed version
- global credentials file exists
- ingestion token exists
- API base URL configured
- project config exists
- project config valid
- git command available
- current directory is git repository
- .agentfeed directories writable
- API preview endpoint reachable
```

---

# 10. Collection Pipeline

## 10.1 Pipeline Order

`agentfeed collect` must run this pipeline:

```text
1. Load config
2. Detect project
3. Detect source agent
4. Parse session metadata if available
5. Collect Git metrics
6. Collect token usage if available
7. Collect test/build results if available
8. Generate changed areas
9. Generate title
10. Generate summary
11. Generate outcome
12. Generate timeline
13. Build LocalDraft
14. Run privacy scan
15. Redact public fields
16. Save draft JSON
17. Save draft Markdown
18. Upload if explicitly requested
```

## 10.2 CollectionContext

```ts
interface CollectionContext {
  cwd: string;
  project_root: string;
  config: AgentFeedProjectConfig;
  source: AgentType;
  session_file?: string;
  started_at?: string;
  ended_at?: string;
}
```

---

# 11. Session Parser

## 11.1 MVP Parser Strategy

MVP parser must be robust even without a known session file.

Minimum behavior:

```text
- If session file exists and is readable, parse best-effort.
- If parsing fails, continue with Git metrics only.
- Never crash collection because parser failed.
```

## 11.2 ParsedSession

```ts
interface ParsedSession {
  source: {
    agent: AgentType;
    model?: string | null;
    session_id?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    cwd: string;
  };
  usage?: TokenUsage | null;
  actions: AgentAction[];
  prompts: PromptSnippet[];
  tool_calls: ToolCallSummary[];
  errors: SessionError[];
}
```

## 11.3 Claude Code Parser

The parser should support best-effort parsing of JSON, JSONL, or text-like session files.

### Input Types

```text
- session_file path from CLI option
- environment variables, if available
```

### Expected Extraction

```text
- session_id
- model
- cwd
- started_at / ended_at if present
- token usage if present
- tool call counts
- failed commands count
- user prompt snippets if safe and config allows
```

### Important

Because Claude Code formats may change, implement tolerant parsing:

```text
- Ignore unknown fields.
- Accept arrays or JSONL lines.
- Continue on malformed lines.
- Never upload raw parsed messages.
```

---

# 12. Git Metrics Collector

## 12.1 Purpose

Git metrics are the most reliable MVP signal of what changed.

## 12.2 Commands

Run these commands from project root:

```bash
git status --porcelain
git diff --numstat
git diff --stat
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git remote get-url origin
```

If any command fails, continue with partial metrics.

## 12.3 GitMetrics

```ts
interface GitMetrics {
  repository_url?: string | null;
  branch?: string | null;
  head_commit?: string | null;
  dirty: boolean;
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  changed_files: ChangedFileSummary[];
}
```

## 12.4 ChangedFileSummary

```ts
interface ChangedFileSummary {
  path: string;
  extension?: string | null;
  language?: string | null;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  lines_added?: number | null;
  lines_removed?: number | null;
  publish_path: boolean;
}
```

## 12.5 File Path Privacy

By default:

```text
publish_path = false
```

The CLI must not include raw changed file paths in upload payload.

Instead, it must convert files into changed areas.

---

# 13. Changed Area Generator

## 13.1 Purpose

Convert private file paths into public-safe feature areas.

## 13.2 Mapping Rules

Examples:

```text
src/signals/scorer.py → Signal scoring logic
src/backtest/report.py → Backtest reporting
tests/test_scorer.py → Test coverage
docker-compose.yml → Deployment configuration
.github/workflows/deploy.yml → CI/CD workflow
README.md → Documentation
package.json → Package configuration
pyproject.toml → Python project configuration
src/api/routes.ts → API routes
src/components/Button.tsx → UI components
```

## 13.3 Rule-based Mapping

Use path segments and filenames:

```text
test, tests, spec → Test coverage
docker, compose, Dockerfile → Docker deployment
.github, workflow, ci → CI/CD workflow
api, routes, controller → API layer
component, ui, page → UI components
auth, login, session → Authentication
db, migration, schema, prisma → Database layer
config, env, settings → Configuration
docs, readme → Documentation
```

## 13.4 Fallback

If no mapping matches:

```text
Application code
```

Deduplicate changed areas.

Maximum changed areas in draft:

```text
8
```

---

# 14. Test / Build Result Collector

## 14.1 MVP Policy

Do not run tests automatically by default.

Only collect test/build information from:

```text
- Parsed agent actions
- Explicit config if run_tests_on_collect is true and the user passes --run-configured-commands
```

## 14.2 Test Command Detection

If `run_tests_on_collect` is true and config command is `auto`, infer:

```text
package.json + scripts.test → npm test
pyproject.toml / pytest.ini → pytest
go.mod → go test ./...
Cargo.toml → cargo test
Makefile with test target → make test
```

## 14.3 TestResult

```ts
interface TestResult {
  command: string;
  status: "passed" | "failed" | "unknown";
  tests_run?: number | null;
  tests_passed?: number | null;
  tests_failed?: number | null;
  duration_seconds?: number | null;
  output_summary?: string | null;
}
```

## 14.4 Safety

If running tests is enabled:

```text
- Apply timeout, default 120 seconds.
- Do not run destructive commands.
- Print command before running.
- Allow user to disable in config.
```

---

# 15. Token / Cost Collector

## 15.1 MVP Sources

Collect token usage from:

```text
1. Parsed Claude Code metadata if present.
2. Unknown otherwise.
```

## 15.2 Cost Policy

Do not estimate cost unless the source provides explicit cost or config allows cost estimate.

Default:

```text
estimated_cost_usd = null
```

## 15.3 Token Fields

If usage exists:

```text
tokens_used = total_tokens
```

If only input/output exist:

```text
tokens_used = input_tokens + output_tokens + cache_creation_tokens + cache_read_tokens
```

---

# 16. Rule-based Summary Generator

## 16.1 Purpose

Create useful worklog drafts without external LLM calls.

## 16.2 Title Generation

Priority:

1. If session parser extracts a concise task title, use it after privacy scan.
2. Else use changed areas.

Template examples:

```text
Updated {primary_changed_area}
Improved {primary_changed_area}
Refactored {primary_changed_area}
Updated {primary_changed_area} and {secondary_changed_area}
```

If Git has no changes:

```text
Explored project with AI agent
```

## 16.3 Summary Generation

Template:

```text
The AI agent worked on {changed_areas_sentence}. The session changed {files_changed} files with {lines_added} additions and {lines_removed} deletions.
```

If tests were detected:

```text
It also ran {tests_run} tests, with {tests_passed} passing.
```

## 16.4 Outcome Generation

MVP should avoid claiming performance improvements unless explicitly parsed.

Safe outcomes:

```text
- Updated {changed_area}
- Added or modified test coverage
- Updated deployment or configuration files
- Generated a reviewable AI worklog draft
```

Do not invent metrics like:

```text
win rate improved
runtime reduced
bugs fixed
```

unless extracted from session text or user-provided data.

## 16.5 Timeline Generation

Default timeline:

```text
1. Collected AI agent session metadata
2. Collected Git change metrics
3. Generated public-safe worklog summary
4. Ran privacy scan
```

If parser found actions, include major actions.

Maximum timeline items:

```text
6
```

---

# 17. Privacy Scanner

## 17.1 Scan Target

Scan only fields that may be uploaded:

```text
title
summary
public_prompt
outcome
timeline.title
timeline.description
changed_areas
tags
project.name
project.repository_url
```

## 17.2 Sensitive Patterns

Implement regex-based detection for:

```text
- OpenAI key: sk-...
- Anthropic key: sk-ant-...
- GitHub token: ghp_, github_pat_
- AWS access key: AKIA...
- Google API key: AIza...
- Discord bot token-like strings
- JWT: header.payload.signature
- Database URL: postgres://, mysql://, mongodb://, redis://
- Email address
- Private IP URL
- localhost URL
- .env references
- id_rsa references
- credentials.json references
- Absolute local paths
```

## 17.3 Severity Rules

High:

```text
- API key pattern
- database URL
- JWT
- credentials file reference with value
```

Medium:

```text
- email address
- private URL
- localhost URL
- absolute local path
```

Low:

```text
- sensitive filename reference without value
- internal-looking package or path
```

## 17.4 Redaction

Apply redaction to uploadable public fields.

Replacement values:

```text
[REDACTED_SECRET]
[REDACTED_EMAIL]
[REDACTED_URL]
[REDACTED_PATH]
[REDACTED_DATABASE_URL]
```

## 17.5 Privacy Status Calculation

```text
If any high finding: danger
Else if any medium or low finding: warning
Else: safe
```

## 17.6 Finding ID

Generate stable-ish local finding ID:

```text
finding_<short_hash(type + field + sample)>
```

---

# 18. Local Draft Creation

## 18.1 Draft ID

Format:

```text
draft_YYYYMMDD_HHMMSS_<random4>
```

Example:

```text
draft_20260519_102000_abcd
```

## 18.2 Draft JSON Path

```text
.agentfeed/drafts/draft_20260519_102000_abcd.json
```

## 18.3 Draft Markdown Path

```text
.agentfeed/drafts/draft_20260519_102000_abcd.md
```

## 18.4 Markdown Draft Format

```md
# Improved signal scoring logic

The AI agent worked on signal scoring logic and test coverage.

## Metrics

- Agent: Claude Code
- Tokens: 129K
- Files changed: 7
- Lines: +412 -188
- Tests: 14

## Changed Areas

- Signal scoring logic
- Test coverage

## Outcome

- Updated signal scoring logic
- Added or modified test coverage

## Privacy

Status: safe
```

---

# 19. Upload Mapping

## 19.1 LocalDraft to IngestWorklogRequest

Mapping:

```text
LocalDraft.source.agent → request.source.agent
LocalDraft.source.tool_version → request.source.tool_version
LocalDraft.source.host_label → request.source.host_label
LocalDraft.source.session_id → request.source.session_id
LocalDraft.id → request.source.local_draft_id

LocalDraft.project.name → request.project.name
LocalDraft.project.repository_url → request.project.repository_url
LocalDraft.project.local_path_hash → request.project.local_path_hash

LocalDraft.worklog.title → request.worklog.title
LocalDraft.worklog.summary → request.worklog.summary
LocalDraft.worklog.category → request.worklog.category
LocalDraft.worklog.tags → request.worklog.tags
LocalDraft.worklog.metrics → request.worklog.metrics
LocalDraft.worklog.changed_areas → request.worklog.changed_areas
LocalDraft.worklog.public_prompt → request.worklog.public_prompt
LocalDraft.worklog.outcome → request.worklog.outcome
LocalDraft.worklog.timeline → request.worklog.timeline

LocalDraft.privacy_scan → request.privacy_scan
```

## 19.2 Excluded from Upload

Do not upload:

```text
- raw transcript
- raw code diff
- local file paths
- local absolute project path
- command full output
- credentials
- local config contents
```

---

# 20. Browser Opening

When opening review URL, support:

macOS:

```bash
open <url>
```

Linux:

```bash
xdg-open <url>
```

WSL:

```bash
wslview <url>
```

If opening fails, print URL.

---

# 22. Logging

## 22.1 Log File

Project collector log:

```text
.agentfeed/logs/collector.log
```

Global CLI log, optional:

```text
~/.agentfeed/logs/agentfeed.log
```

## 22.2 Log Rules

Allowed:

```text
- command name
- status
- error code
- stack trace in debug mode
- file counts
```

Forbidden:

```text
- ingestion token
- raw prompt
- raw transcript
- raw code
- .env contents
```

## 22.3 Debug Mode

Enable verbose logs with:

```bash
AGENTFEED_DEBUG=1
```

Even in debug mode, do not log secrets.

---

# 23. Environment Variables

The CLI must support:

```text
AGENTFEED_API_BASE_URL
AGENTFEED_TOKEN
AGENTFEED_DEBUG
AGENTFEED_NO_COLOR
AGENTFEED_CI
```

Behavior:

```text
AGENTFEED_TOKEN overrides credentials.json token.
AGENTFEED_API_BASE_URL overrides config API URL.
AGENTFEED_NO_COLOR disables colored output.
AGENTFEED_CI disables interactive prompts.
```

---

# 24. Validation Rules

## 24.1 Draft Validation

Before saving/uploading, validate:

```text
title length: 1-120
summary length: 1-2000
tags: max 10, lowercase preferred
changed_areas: max 8
outcome: max 10
timeline: max 8
category: valid enum
agent: valid enum
visibility: must be private locally
```

## 24.2 Upload Payload Size

Keep payload under:

```text
512KB
```

If larger:

```text
- Trim timeline.
- Trim outcome.
- Remove public_prompt.
- Retry validation locally.
```

---

# 25. Test Requirements

The implementation must include tests for the following.

## 25.1 Config Tests

```text
- init creates expected directories.
- init creates valid config.
- env vars override config.
- missing config produces helpful error.
```

## 25.2 Privacy Scanner Tests

```text
- detects OpenAI key-like string.
- detects Anthropic key-like string.
- detects GitHub token-like string.
- detects email address.
- detects localhost URL.
- detects database URL.
- redacts high severity secret.
- calculates danger status for high severity.
```

## 25.3 Git Collector Tests

Use a temporary Git repo.

```text
- detects changed files.
- counts added lines.
- counts removed lines.
- handles non-git directory gracefully.
- does not expose raw file paths in upload payload.
```

## 25.4 Draft Tests

```text
- collect creates JSON draft.
- collect creates Markdown draft.
- latest draft resolution works.
- preview handles missing draft.
```

## 25.5 API Client Tests

Mock fetch.

```text
- publish sends expected payload.
- publish handles 401.
- publish handles 413.
- publish handles 422.
- publish handles 429.
- publish updates draft upload metadata on success.
```

---

# 26. Done Criteria

The local CLI MVP is considered complete when:

```text
1. `agentfeed init` creates project config.
2. `agentfeed login --token` stores credentials.
3. `agentfeed collect` creates a local draft in a Git repo.
4. The draft contains title, summary, metrics, changed areas, timeline, privacy scan.
5. The draft does not contain raw code diff or raw transcript.
6. `agentfeed preview` displays the latest draft.
7. `agentfeed publish` uploads to backend `/ingest/worklogs`.
8. Successful upload stores `worklog_id` and `review_url` in draft JSON.
9. Privacy scanner catches common secrets.
10. Tests pass.
```

---

# 27. Suggested Source Structure

```text
src/
├── cli/
│   ├── index.ts
│   └── commands/
│       ├── init.ts
│       ├── login.ts
│       ├── status.ts
│       ├── collect.ts
│       ├── preview.ts
│       ├── publish.ts
│       ├── scan.ts
│       └── doctor.ts
├── config/
│   ├── project-config.ts
│   ├── credentials.ts
│   └── defaults.ts
├── collectors/
│   ├── git.ts
│   ├── tests.ts
│   ├── tokens.ts
│   └── project.ts
├── adapters/
│   ├── base.ts
│   └── claude-code.ts
├── parser/
│   ├── parse-session.ts
│   └── normalize-actions.ts
├── privacy/
│   ├── scan.ts
│   ├── redact.ts
│   └── patterns.ts
├── summary/
│   ├── changed-areas.ts
│   └── rule-based.ts
├── draft/
│   ├── create.ts
│   ├── read.ts
│   ├── write.ts
│   ├── latest.ts
│   └── markdown.ts
├── api/
│   └── client.ts
├── utils/
│   ├── fs.ts
│   ├── git.ts
│   ├── hash.ts
│   ├── logger.ts
│   ├── shell.ts
│   └── open-browser.ts
└── schemas/
    ├── config.ts
    ├── draft.ts
    └── api.ts
```

---

# 28. Implementation Order for AI Coding Agent

Implement in this exact order.

## Step 1: Project skeleton

```text
- package.json
- tsconfig.json
- CLI entrypoint
- build script
- test script
```

## Step 2: Shared schemas

```text
- enums
- config schema
- draft schema
- API payload schema
```

## Step 3: Config and credentials

```text
- project config read/write
- global credentials read/write
- env var overrides
```

## Step 4: init/login/status

```text
- agentfeed init
- agentfeed login --token
- agentfeed status
```

## Step 5: Git collector

```text
- project root detection
- git diff stat parsing
- repository URL detection
```

## Step 6: Summary generator

```text
- changed areas
- title
- summary
- outcome
- timeline
```

## Step 7: Privacy scanner

```text
- patterns
- redaction
- findings
- status calculation
```

## Step 8: Draft system

```text
- create draft
- save JSON
- save Markdown
- latest draft lookup
```

## Step 9: collect/preview/scan

```text
- agentfeed collect
- agentfeed preview
- agentfeed scan
```

## Step 10: API client/publish

```text
- upload mapping
- publish command
- error handling
- update draft upload metadata
```

## Step 11: doctor/tests polish

```text
- doctor command
- tests
- README usage examples
```

---

# 29. Example End-to-End Flow

## 29.1 Developer Setup

```bash
npm install -g agentfeed-cli

cd ~/projects/binance-signal-bot
agentfeed init
agentfeed login --token af_live_xxxxxxxxx
```

## 29.2 After AI Coding Session

Run explicit collection after the session:

```bash
agentfeed collect --source claude-code
```

Output:

```text
Draft created.

ID: draft_20260519_102000_abcd
Privacy: safe
Metrics: 7 files · +412 -188 · 14 tests · 129K tokens

Preview:
  agentfeed preview --id draft_20260519_102000_abcd

Upload:
  agentfeed publish --id draft_20260519_102000_abcd
```

## 29.3 Upload

```bash
agentfeed publish --id draft_20260519_102000_abcd --open-review
```

Output:

```text
Worklog uploaded.

Status: needs_review
Review URL:
https://agentfeed.downingmoon.dev/worklogs/worklog_123/review
```

The user reviews and publishes on the AgentFeed website.

---

# 30. Non-negotiable Privacy Requirements

The implementation must satisfy these requirements.

```text
- Never upload raw transcript.
- Never upload raw code diff.
- Never upload full command output.
- Never upload .env contents.
- Never auto-publish public worklogs.
- Always create local draft first.
- Always upload as private/needs_review.
- Always show review URL after upload.
- Always keep local draft if upload fails.
- Always redact detected secrets in uploadable fields.
```

---

# 31. Final Implementation Summary

The CLI MVP should feel like this:

```bash
agentfeed init
agentfeed login --token af_live_xxx
# user works with Claude Code
agentfeed preview
agentfeed publish --latest --open-review
```

The backend API is already implemented.  
The CLI's job is to produce a safe, structured payload for:

```http
POST /ingest/worklogs
```

The most important implementation principle:

```text
AgentFeed shares what you built with AI, not your private code or raw agent memory.
```

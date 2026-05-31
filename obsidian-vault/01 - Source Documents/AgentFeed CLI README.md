---
title: AgentFeed CLI README
aliases:
  - AgentFeed CLI README
tags:
  - agentfeed/cli
  - source-doc
source_path: README.md
status: synced-copy
created: 2026-05-30
updated: 2026-05-31
---

> [!info] 원본 문서 복사본
> 원본: `README.md`. 이 파일은 Obsidian 탐색과 wikilink 연결을 위한 Vault 내부 복사본입니다.

# AgentFeed CLI

Local CLI MVP for creating public-safe AgentFeed worklog drafts from AI-assisted development sessions.

## Install

The npm package is published as `agentfeed-cli` and exposes the `agentfeed` command:

```bash
npm install -g agentfeed-cli
agentfeed --help
```

```bash
agentfeed init
agentfeed login
agentfeed rotate
agentfeed hook install claude-code
agentfeed collect
agentfeed collect --explain
agentfeed collect --source codex
agentfeed collect --source gemini-cli
agentfeed collect --source claude-code --session-file "$CLAUDE_SESSION_FILE"
agentfeed collect --run-configured-commands
agentfeed share
agentfeed share --dry
agentfeed share --open-review
agentfeed share --run-configured-commands
agentfeed collect --since 2026-05-20T01:00:00Z
agentfeed collect --all
agentfeed preview
agentfeed scan --id <draft_id> --dry-run
agentfeed publish --latest --open-review
agentfeed open --latest
```

The CLI creates `.agentfeed/drafts/*.json` first and uploads only reviewable private drafts. It does not upload raw diffs, raw transcripts, `.env` contents, or secrets.


## Login and token rotation

`agentfeed login` opens the AgentFeed browser approval flow by default. If you already have a token from AgentFeed Settings or a secret manager, prefer stdin so the raw secret is not stored in shell history or process argv:

```bash
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token-stdin
printf '%s' "$AGENTFEED_TOKEN" | agentfeed login --token - --no-save
```

Literal `agentfeed login --token <token>` input is disabled by default because raw secrets can leak through shell history and process listings. Use stdin (`--token-stdin` or `--token -`) for existing tokens; a local throwaway development escape hatch exists only when `AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1` is set.

When a saved device token is near expiry or compromised, run:

```bash
agentfeed rotate
agentfeed rotate --browser
agentfeed token rotate
```

`agentfeed rotate` replaces the saved token through the API, saves the new secret locally, and does not print the raw token. If the saved token is already invalid or expired, the command falls back to the browser login replacement flow.

| Token source | Recommended rotation path | Result |
| --- | --- | --- |
| Saved credentials file | `agentfeed rotate` | Rotates through the API and writes the replacement to `~/.agentfeed/credentials.json`. |
| Browser replacement | `agentfeed rotate --browser` | Opens AgentFeed approval and saves the replacement token locally. |
| `AGENTFEED_TOKEN` environment variable | Rotate or issue a token in AgentFeed Settings, update your shell/secret manager, then run `agentfeed status`. Or run `unset AGENTFEED_TOKEN && agentfeed rotate --browser` to switch back to saved credentials. | The CLI never mutates environment variables in place and never prints raw browser-issued tokens. |

Use `agentfeed doctor` to check server-side token validity and expiry.


## One-command sharing

`agentfeed share` is the recommended daily command. It creates a local draft, prints the public-safe preview that will be uploaded, then uploads it as a private AgentFeed review draft.

```bash
agentfeed share              # collect -> preview -> upload private review draft
agentfeed share --dry        # collect + preview only, keep the local draft
agentfeed share --open-review
agentfeed share --note "Fixed auth flow"
agentfeed share --no-clipboard
agentfeed share --json --clipboard   # automation JSON keeps clipboard off unless explicitly requested
agentfeed share --source codex
agentfeed share --source gemini-cli --session-file ./session.jsonl
agentfeed share --run-configured-commands
```

`--note` is stored as a separate public-safe author note, not folded into the generated worklog summary.

Use `--json` for automation. Dry-run output is shaped as `{ dry_run, reused_existing_draft, draft, privacy_policy }`; upload output is shaped as `{ dry_run, reused_existing_draft, draft_id, draft, upload, privacy_policy }` so scripts can verify the exact public-safe draft that was uploaded alongside the review URL. JSON mode has no clipboard side effects unless `--clipboard` is passed explicitly.

## Scoped and incremental collection

By default, successful `collect` and non-dry `share` runs save `.agentfeed/state.json` with the last collection timestamp. Later runs use that timestamp as the default lower bound so long-lived agent sessions do not get counted repeatedly.

```bash
agentfeed collect --explain       # shows the collection window
agentfeed collect --since 2026-05-20T01:00:00Z
agentfeed collect --until 2026-05-20T02:00:00Z
agentfeed collect --all           # ignore the saved cursor for a full rescan
agentfeed share --all             # same for one-command sharing
```



`collect` combines Git metrics with local agent session metadata when available. Claude Code JSONL transcripts, Codex JSONL rollouts, Gemini CLI chat logs, and OMC/OMX/Superpowers metadata are parsed locally for safe aggregate data such as edited file paths, line counts, token usage, test commands, failed commands, tool calls, skills used, subagent counts, collection quality, model, and session id; raw transcript content is not stored in the draft. Unknown local agent/plugin metadata is collected as low-confidence aggregate signals when no known agent session is found, and `--explain` shows the non-path source summary used for the draft.

Repo-local test/build commands are never executed by default, even when `.agentfeed/config.json` enables `collection.run_tests_on_collect`. Use `agentfeed collect --run-configured-commands` or `agentfeed share --run-configured-commands` only in repositories whose config and scripts you trust. Shell-interpreter wrappers such as `sh -c`, `bash -lc`, `zsh -c`, `cmd.exe /c`, or PowerShell are refused even with this flag; configure a direct test/build command such as `npm test`, `npm run build`, `pytest`, `go test ./...`, or `make test` instead. Configured commands also run with sensitive environment variables scrubbed (`AGENTFEED_TOKEN`, npm auth tokens, cloud credentials, and common `*_TOKEN`/`*_SECRET` names); use `AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST=NAME1,NAME2` only when you intentionally need to pass a specific variable.


## Diagnostics and duplicate safety

`agentfeed doctor` reports API reachability, ingestion token validity, and local Claude Code, Codex CLI, Gemini CLI, OMC, OMX, and Superpowers signals so setup problems are easier to diagnose.

Draft collection also records a stable fingerprint from `session_id + git head + collection_window`; repeated runs reuse the existing local draft unless `--force` or `--all` is used. If that draft was already uploaded, `share` / `publish` reuse the saved review URL instead of uploading a duplicate worklog.

Successful `share` / `publish` copies the review URL to the clipboard when the platform supports it. Use `--no-clipboard` to opt out.

Use `agentfeed open`, `agentfeed open --latest`, or `agentfeed open --id <draft_id>` to reopen a previously uploaded private review draft in your browser. Cached review URLs are opened only when they match the trusted AgentFeed host or the configured local/custom API base.

## Privacy scan dry-run

Run a safe redaction preview before uploading or after manually editing a draft:

```bash
agentfeed scan --id <draft_id> --dry-run
agentfeed scan --id <draft_id>
```

`--dry-run` prints finding severity, field, redaction placeholder, and redacted preview without showing the original secret or modifying the draft. Without `--dry-run`, `scan` updates the draft's uploadable public fields with redacted values and saves the `privacy_scan` result. The scanner redacts common API tokens, secret assignments, private key blocks, authorization headers, credentialed URLs, local/private URLs including IPv6/link-local metadata URLs, emails, and local filesystem paths.

`share` and `publish` upload a **private review draft**, not a public worklog. If high-severity findings remain, the CLI now states that public/unlisted publishing is blocked in AgentFeed until those findings are resolved, while the private review upload is still allowed so you can resolve the findings in the web review.

# AgentFeed CLI

Local CLI MVP for creating public-safe AgentFeed worklog drafts from AI-assisted development sessions.

```bash
agentfeed init
agentfeed login --token af_live_xxx
agentfeed hook install claude-code
agentfeed collect
agentfeed collect --explain
agentfeed collect --source codex
agentfeed collect --source gemini-cli
agentfeed collect --source claude-code --session-file "$CLAUDE_SESSION_FILE"
agentfeed share
agentfeed share --dry
agentfeed share --open-review
agentfeed collect --since 2026-05-20T01:00:00Z
agentfeed collect --all
agentfeed preview
agentfeed publish --latest --open-review
```

The CLI creates `.agentfeed/drafts/*.json` first and uploads only reviewable private drafts. It does not upload raw diffs, raw transcripts, `.env` contents, or secrets.


## One-command sharing

`agentfeed share` is the recommended daily command. It creates a local draft, prints the public-safe preview that will be uploaded, then uploads it as a private AgentFeed review draft.

```bash
agentfeed share              # collect -> preview -> upload private review draft
agentfeed share --dry        # collect + preview only, keep the local draft
agentfeed share --open-review
agentfeed share --note "Fixed auth flow"
agentfeed share --no-clipboard
agentfeed share --source codex
agentfeed share --source gemini-cli --session-file ./session.jsonl
```

Use `--json` for automation.

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


## Diagnostics and duplicate safety

`agentfeed doctor` reports API reachability, ingestion token validity, and local Claude Code, Codex CLI, Gemini CLI, OMC, OMX, and Superpowers signals so setup problems are easier to diagnose.

Draft collection also records a stable fingerprint from `session_id + git head + collection_window`; repeated runs reuse the existing local draft unless `--force` or `--all` is used. If that draft was already uploaded, `share` / `publish` reuse the saved review URL instead of uploading a duplicate worklog.

Successful `share` / `publish` copies the review URL to the clipboard when the platform supports it. Use `--no-clipboard` to opt out.

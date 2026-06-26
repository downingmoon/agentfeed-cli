---
title: CLI Codex Shell Edit File Metrics 2026-06-26
tags:
  - agentfeed
  - cli
  - collection
status: done
date: 2026-06-26
---

# CLI Codex Shell Edit File Metrics 2026-06-26

## Problem

Codex sessions that created or edited files through `exec_command` shell heredocs or `git status --short` output could spend tokens and run commands while AgentFeed reported `files_changed: 0`.

## Evidence

- Carrot Codex session: `/home/ubuntu/.codex/sessions/2026/06/19/rollout-2026-06-19T12-21-45-019edfd4-7e04-76f3-9a25-a5a08d5a36a7.jsonl`
- Before fix: parser saw `commands_run: 38`, `patch_apply_end: 0`, `changed_files: []`.
- After fix: same session parses as `files_changed: 4`, `lines_added: 845`.

## Fix

- Added Codex shell file evidence extraction for:
  - heredoc writes such as `cat > file <<EOF` and `tee file <<EOF`
  - `git status --short` output
  - `git diff --numstat` output
- Kept raw file paths/content out of public draft payloads; only aggregate metrics and changed-area labels are uploaded.

## Verification

- `npm test -- --run` → 226 files, 850 tests passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Manual CLI scratch repo QA: `agentfeed collect --source codex --session-file codex-shell.jsonl --all --json --no-save-cursor` returned `files_changed: 1`, `lines_added: 1` for shell-only edit evidence.

## Related

- [[CLI Agent Session Codex Parser Split 2026-06-23]]
- [[Collection System]]

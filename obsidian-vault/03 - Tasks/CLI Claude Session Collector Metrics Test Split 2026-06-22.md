---
title: CLI Claude Session Collector Metrics Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI Claude session collector metrics test split
  - CLI Claude session collector metrics test split
---

# CLI Claude Session Collector Metrics Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 Claude Code token/file/test metrics, failed Bash result parsing, assistant turn/subagent counting, TaskCreate exclusion, failed edit exclusion coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `9d36bd6 Split CLI Claude session collector metrics tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-claude-metrics.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / Claude session collector metrics suite isolation

## Background

[[CLI Status Output Contract Test Split 2026-06-22]] 이후 next oversized/contract-risk surface로 `tests/session-collector.test.ts`를 스캔했다. 이번 pass는 Claude Code session JSONL parsing behavior 중 metrics-related cluster만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-claude-metrics.test.ts` 추가.
  - Claude Code usage token accounting, Write/Edit changed-file summary, Bash test command detection 계약을 보존했다.
  - Claude `tool_result` rows에서 failed Bash test result를 failed command로 집계하는 계약을 보존했다.
  - `0 failed` test summary를 failure로 오인하지 않는 계약을 보존했다.
  - Claude assistant turns, `Task`/`Agent` subagent launch counting 계약을 보존했다.
  - `TaskCreate` todo planning tool call은 subagent launch로 세지 않는 계약을 보존했다.
  - failed `Write` result는 changed files에 포함하지 않는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 Claude metrics cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "Claude Code tokens|Claude Code failed Bash|successful Claude test summaries|Claude assistant turns|Claude TaskCreate|failed Claude file edits": 1 file / 6 tests passed / 59 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-claude-metrics.test.ts -t "Claude Code tokens|Claude Code failed Bash|successful Claude test summaries|Claude assistant turns|Claude TaskCreate|failed Claude file edits": 1 file passed / 1 skipped, 6 tests passed / 59 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-claude-metrics.test.ts: 2 files / 65 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 163 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new Claude metrics suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 1193 pure LOC after split; still oversized.
tests/session-collector-claude-metrics.test.ts: 126 pure LOC.
```

## Follow-up

> [!success]
> Codex patch/apply_patch metrics follow-up was completed by [[CLI Codex Patch Session Collector Metrics Test Split 2026-06-22]]. `tests/session-collector.test.ts` is now 1077 pure LOC.

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 1077 pure LOC. Continue only by cohesive behavior clusters such as command/test runner recognition, session ownership/discovery, Gemini metrics, OMX/generic metadata, draft integration, or collection window filtering. Preserve baseline coverage before each split.

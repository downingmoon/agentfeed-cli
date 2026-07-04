---
title: CLI Claude Hook Installer Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI Claude legacy hook setuper test split
  - CLI Claude legacy hook setuper test split
---

# CLI Claude Hook Installer Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 Claude Code legacy hook setuper 계약을 `cli-claude-code-hook-installer` suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `e537dc3 Split CLI Claude legacy hook setuper tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-claude-code-hook-installer.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / Claude Code legacy hook setuper isolation

## Background

`tests/api-hook.test.ts`는 API client, browser login, publish retry/timeout, and Claude Code legacy hook setuper 계약이 한 파일에 섞인 1,958 pure LOC oversized suite였다. Hook installer block은 이미 별도 `describe('Claude Code legacy hook setuper')` 책임을 갖고 있었고 API client/browser login fixture와 직접 결합하지 않아 독립 suite로 이동했다.

## Changes

- `tests/cli-claude-code-hook-installer.test.ts` 추가.
  - uninstall with no existing settings는 settings file을 생성하지 않는다.
  - malformed/non-object Claude settings는 user config shape를 보존하며 actionable error를 낸다.
  - Stop hook command는 collection failure를 log에 남기되 exit success를 유지하고 secrets를 redaction한다.
  - install/uninstall은 기존 settings와 unrelated hook command를 보존하고 AgentFeed hook만 dedupe/remove한다.
- moved test의 settings JSON traversal에서 기존 `any` escape를 제거하고 typed guards로 `Stop` hook commands를 추출했다.
- `tests/api-hook.test.ts`에서 legacy hook setuper imports/block을 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/api-hook.test.ts: 1 file / 133 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-claude-code-hook-installer.test.ts: 2 files / 133 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 133 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 1848 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-claude-code-hook-installer.test.ts: 141 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions.
```

## Follow-up

> [!todo]
> Follow-up API health-check split completed in [[CLI API Health Check Test Split 2026-06-22]]. `tests/api-hook.test.ts` still remains oversized at 1,659 pure LOC. Continue only cohesive, behavior-preserving splits with green baseline coverage. Likely next groups: browser login session/polling/exchange policy, publish timeout/retry/duplicate ingestion handling, or upload cache/lock contracts.

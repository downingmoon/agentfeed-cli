---
title: CLI Upload Lock Contract Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI upload lock contract test split
  - CLI upload lock contract test split
---

# CLI Upload Lock Contract Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 draft upload lock acquisition, heartbeat, stale-lock cleanup, token hash privacy, and heartbeat-failure fail-closed contracts를 focused upload-lock suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `6ccd524 Split CLI upload lock contract tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-upload-lock-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / upload lock concurrency and privacy suite isolation

## Background

[[CLI Ingest Upload Retry Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 draft upload lock lifecycle checks가 남아 있었다. 이 케이스들은 remote ingest success/error semantics가 아니라 local upload mutual-exclusion, heartbeat, stale-lock handling, and lock-token privacy에 응집돼 있어 focused suite로 이동했다.

## Changes

- `tests/cli-upload-lock-contract.test.ts` 추가.
  - held lock이 있을 때 upload 없이 fast-fail한다.
  - owner heartbeat가 fresh하면 lock을 보존하고 raw lock hash를 error detail에 노출하지 않는다.
  - upload lock에는 raw token을 저장하지 않고 matching lock hash만 release한다.
  - upload 중 heartbeat가 실패하면 upload metadata를 저장하지 않고 fail-closed한다.
  - heartbeat가 없는 stale lock은 pid reuse 상황에서도 제거하고 upload를 진행한다.
- `tests/api-hook.test.ts`에서 upload-lock block, unused `AgentFeedApiError`, lock env snapshots, unused fs imports를 제거했다.
- 옮긴 테스트의 `as AgentFeedApiError` assertion은 `instanceof` narrowing으로 정리했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 31 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-upload-lock-contract.test.ts: 2 files / 31 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 143 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 567 pure LOC after split; still oversized.
tests/cli-upload-lock-contract.test.ts: 173 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> Follow-up cached upload reuse/stale cache contract split completed in [[CLI Cached Upload Reuse Test Split 2026-06-22]]. `tests/api-hook.test.ts` still remains oversized at 390 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: upload response/status contract remnants, re-scan redactions, timeout reconciliation tests, publish API friendly error handling, visibility contract/basic publish/concurrency tests.

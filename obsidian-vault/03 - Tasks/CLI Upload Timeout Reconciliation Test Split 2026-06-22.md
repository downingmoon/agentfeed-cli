---
title: CLI Upload Timeout Reconciliation Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI upload timeout reconciliation test split
  - CLI upload timeout reconciliation test split
---

# CLI Upload Timeout Reconciliation Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 upload request timeout, duplicate-ingest timeout reconciliation, and untrusted duplicate review URL fail-closed contracts를 focused timeout-reconciliation suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `a38e117 Split CLI upload timeout reconciliation tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-upload-timeout-reconciliation-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / upload timeout and duplicate reconciliation suite isolation

## Background

[[CLI Cached Upload Reuse Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 upload timeout and retry reconciliation contracts가 남아 있었다. 이 케이스들은 generic publish API handling보다 request abort timeout, retry body stability, duplicate ingest reconciliation, and untrusted duplicate review URL safety에 응집돼 있어 focused suite로 이동했다.

## Changes

- `tests/cli-upload-timeout-reconciliation-contract.test.ts` 추가.
  - upload request timeout 시 `API_REQUEST_TIMEOUT` guidance를 반환하고 local draft를 pending으로 유지한다.
  - 첫 upload timeout 뒤 duplicate ingest response를 받으면 기존 private review draft로 reconcile하고 upload metadata를 저장한다.
  - timeout 뒤 duplicate ingest response가 untrusted review URL을 반환하면 draft를 pending으로 유지한다.
- `tests/api-hook.test.ts`에서 timeout/reconciliation block과 전용 retry-env/abort helper를 제거했다.
- 이동 중 기존 `Record<string, any>` request body assertion은 `unknown` + `recordField()` helper로 정리했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 18 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-upload-timeout-reconciliation-contract.test.ts: 2 files / 18 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 145 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 263 pure LOC after split; still oversized by the 250 pure LOC ceiling.
tests/cli-upload-timeout-reconciliation-contract.test.ts: 159 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 263 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. The smallest next candidates are the visibility/source contract top-level test or publish API friendly error handling; either should bring `api-hook` below the 250 pure LOC ceiling.

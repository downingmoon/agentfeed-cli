---
title: CLI Ingest Upload Retry Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI ingest upload retry test split
  - CLI ingest upload retry test split
---

# CLI Ingest Upload Retry Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 duplicate ingestion reconciliation, transient upload retry, validation non-retry, malformed ingest error response, and rate-limit retry contracts를 focused ingest-upload retry suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `8f9319d Split CLI ingest upload retry tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-ingest-upload-retry-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / ingest upload retry and duplicate handling suite isolation

## Background

[[CLI Ingest Payload Contract Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 publish upload orchestration과 섞인 API retry/error response contracts가 남아 있었다. 이 케이스들은 backend ingest upload response semantics와 local draft upload-state preservation에 응집돼 있어 timeout-specific tests와 분리해 focused suite로 이동했다.

## Changes

- `tests/cli-ingest-upload-retry-contract.test.ts` 추가.
  - duplicate ingestion response with trusted review URL을 successful resync로 처리한다.
  - `/worklogs/:id/review` route에서 worklog id를 reconcile한다.
  - transient `SERVICE_UNAVAILABLE` upload failure 뒤 성공 응답을 retry 처리한다.
  - validation error는 retry하지 않는다.
  - malformed ingest error response envelope/detail/missing details를 `API_RESPONSE_INVALID`로 fail-closed 처리하고 draft를 pending으로 유지한다.
  - rate-limited response with retry window를 retry한다.
- `tests/api-hook.test.ts`에서 해당 retry/duplicate/error-response block을 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 39 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-ingest-upload-retry-contract.test.ts: 2 files / 39 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 142 files / 848 tests passed
Post-cleanup targeted smoke: npm test -- --run tests/api-hook.test.ts tests/cli-ingest-upload-retry-contract.test.ts: 2 files / 39 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 714 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-ingest-upload-retry-contract.test.ts: 149 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 714 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: upload lock tests, cached upload reuse/stale cache contracts, upload review frontend host trust tests, timeout reconciliation tests, or publish API friendly error handling.

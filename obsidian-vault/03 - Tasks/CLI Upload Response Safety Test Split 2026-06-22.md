---
title: CLI Upload Response Safety Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI upload response safety test split
  - CLI upload response safety test split
---

# CLI Upload Response Safety Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 malformed upload success envelope, unsafe review URL, unknown status, and duplicate-ingest untrusted review URL safety contracts를 focused upload-response suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `a99e8fb Split CLI upload response safety tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-upload-response-safety.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / upload response safety suite isolation

## Background

[[CLI Browser Login Polling Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 upload success response and duplicate ingest review URL safety checks가 남아 있었다. 이 케이스들은 `parsePublishDraftResult()`, `validateReviewUrl()`, duplicate ingest reconciliation의 fail-closed contract에 응집돼 있어 별도 suite로 분리했다.

## Changes

- `tests/cli-upload-response-safety.test.ts` 추가.
  - malformed upload success response는 local draft upload metadata를 저장하지 않는다.
  - invalid JSON and missing data envelope는 `API_RESPONSE_INVALID`로 실패한다.
  - unsafe review URL variants는 upload success로 신뢰하지 않는다.
  - unknown upload status는 fail-closed 처리된다.
  - duplicate ingestion response의 untrusted review URL은 successful resync로 처리하지 않는다.
- `tests/api-hook.test.ts`에서 upload response safety block을 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 64 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-upload-response-safety.test.ts: 2 files / 64 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 139 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 968 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-upload-response-safety.test.ts: 123 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/TODO/FIXME/eslint-disable/empty-catch additions.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 968 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: publish timeout/retry/duplicate ingestion handling, remote preview contract tests, publish API error/friendly error handling, or ingest payload serialization/privacy contracts.

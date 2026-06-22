---
title: CLI Browser Login Flow Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI browser login flow test split
  - CLI browser login flow test split
---

# CLI Browser Login Flow Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 browser login orchestration, credential-save guard, CI fail-fast, and repo-local API discovery policy contracts를 focused browser-login suites로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `7b01268 Split CLI browser login flow tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-browser-login-flow.test.ts`
  - `tests/cli-browser-login-save-policy.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / browser login orchestration suite isolation

## Background

`tests/api-hook.test.ts`에 browser login orchestration checks가 upload/preview/polling contracts 사이에 남아 있었다. Direct CLI auth session API tests는 이미 [[CLI Auth Session API Test Split 2026-06-22]]에서 분리됐으므로, 이번에는 higher-level `browserLogin()` flow 책임만 분리했다.

## Changes

- `tests/cli-browser-login-flow.test.ts` 추가.
  - malformed browser exchange responses never overwrite existing credentials.
  - CI/GitHub Actions fail fast without browser login side effects.
  - no-open browser login exchanges session, validates ingestion token, and saves credentials.
  - moved request body parsing from `as { ... }` assertions to `parsedRequestBody()` typed guard.
- `tests/cli-browser-login-save-policy.test.ts` 추가.
  - invalid exchanged ingestion token fails before saving credentials.
  - incompatible API metadata fails before session creation and saving.
  - `save: false` returns credentials without writing credentials file.
  - repo-local `BACKEND_PORT` discovery remains ignored unless `AGENTFEED_TRUST_REPO_API_BASE=1`.
- `tests/api-hook.test.ts`에서 browser login orchestration imports/block and local ingestion-status helper를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-browser-login-flow.test.ts tests/cli-browser-login-save-policy.test.ts: 3 files / 92 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 137 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 1,176 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-browser-login-flow.test.ts: 227 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions.
tests/cli-browser-login-save-policy.test.ts: 197 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 1,176 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: `waitForCliAuthExchange()` polling policy, publish timeout/retry/duplicate ingestion handling, or upload response/review URL safety contracts.

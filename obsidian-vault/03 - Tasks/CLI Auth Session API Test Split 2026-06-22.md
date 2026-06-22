---
title: CLI Auth Session API Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI auth session API test split
  - CLI auth session API test split
---

# CLI Auth Session API Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 direct CLI auth session creation/exchange and authorize URL trust contract checks를 `cli-auth-session-api` suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `19ae74d Split CLI auth session API tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-auth-session-api.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / direct CLI auth session API suite isolation

## Background

`tests/api-hook.test.ts`는 API client upload contracts, browser login orchestration, and direct CLI auth session API parsing/trust checks가 한 파일에 섞인 oversized suite였다. `createCliAuthSession()`/`exchangeCliAuthSession()` 및 authorize URL trust checks는 full `browserLogin()` orchestration fixture와 독립적으로 검증할 수 있어 purpose-named suite로 이동했다.

## Changes

- `tests/cli-auth-session-api.test.ts` 추가.
  - CLI auth session create/exchange request and response parsing.
  - malformed success envelope rejection.
  - unexpected authorize query parameter rejection.
  - untrusted authorize origin rejection.
  - missing human user code rejection.
  - local authorize URL acceptance only for local API bases.
  - public IPv4 HTTP authorize URL acceptance only under explicit insecure override.
  - fake 127-prefixed hostname rejection.
- moved test의 request body parsing에서 기존 `as { ... }` assertion을 새 `parsedRequestBody()` typed guard로 대체했다.
- `tests/api-hook.test.ts`에서 direct CLI auth session imports/block을 제거했다.
- 새 suite에 `AGENTFEED_ALLOW_INSECURE_API` restore와 `vi.unstubAllGlobals()` teardown을 로컬로 보존했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/api-hook.test.ts: 1 file / 101 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-auth-session-api.test.ts: 2 files / 101 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 135 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 1,511 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-auth-session-api.test.ts: 166 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 1,511 pure LOC. Continue only cohesive, behavior-preserving splits with green baseline coverage. Likely next groups: browser login orchestration/no-open/polling policy, publish timeout/retry/duplicate ingestion handling, or upload response/review URL safety contracts.

---
title: CLI API Health Check Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI API health check test split
  - CLI API health check test split
---

# CLI API Health Check Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 API metadata compatibility, backend readiness reachability, ingestion token status/error contract checks를 `cli-api-health-checks` suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `d9f15cd Split CLI API health check tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-api-health-checks.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / API health-check suite isolation

## Background

`tests/api-hook.test.ts`는 API client, browser login, publish retry/timeout, and remaining health/token checks가 한 파일에 섞인 oversized suite였다. API metadata compatibility, readiness endpoint reachability, ingestion token lifecycle/error parsing checks는 API health-check contract로 응집돼 있어 browser login/publish draft flow와 독립 suite로 이동할 수 있었다.

## Changes

- `tests/cli-api-health-checks.test.ts` 추가.
  - `/metadata` compatibility success and malformed metadata response handling.
  - explicit insecure API override 아래 public IPv4 HTTP review origin acceptance policy.
  - `/health/ready` readiness endpoint URL derivation and GET check.
  - `/ingest/status` token lifecycle metadata parsing.
  - malformed ingestion status body/envelope/contract shape fail-closed behavior.
  - invalid/revoked ingestion token and malformed error envelope handling.
- `tests/api-hook.test.ts`에서 API health-check imports/block을 제거했다.
- 새 suite에 `AGENTFEED_ALLOW_INSECURE_API` restore와 `vi.unstubAllGlobals()` teardown을 로컬로 보존했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/api-hook.test.ts: 1 file / 127 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-api-health-checks.test.ts: 2 files / 127 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 134 files / 848 tests passed
Git whitespace: git diff --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 1,659 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-api-health-checks.test.ts: 204 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions. Grep hits were false positives from test names containing "as unhealthy".
```

## Follow-up

> [!todo]
> Follow-up direct CLI auth session API split completed in [[CLI Auth Session API Test Split 2026-06-22]]. `tests/api-hook.test.ts` still remains oversized at 1,511 pure LOC. Continue only cohesive, behavior-preserving splits with green baseline coverage. Likely next groups: browser login orchestration/no-open/polling policy, publish timeout/retry/duplicate ingestion handling, or upload response/review URL safety contracts.

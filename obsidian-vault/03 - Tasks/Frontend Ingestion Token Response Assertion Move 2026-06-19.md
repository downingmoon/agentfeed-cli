---
title: Frontend Ingestion Token Response Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
  - ingestion-token
status: done
aliases:
  - 2026-06-19 ingestion token response assertion move
---

# Frontend Ingestion Token Response Assertion Move 2026-06-19

> [!success]
> `ingestion-token-response-guards.contract.test.ts`의 malformed ingestion token response fail-closed assertion orchestration을 새 `ingestion-token-response-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/ingestion-token-response-guards.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/ingestion-token-response-assertions.ts`
- 기존 fixture/helper 유지: `agentfeed-frontend/src/lib/ingestion-token-response-guard-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `ingestion-token-response-guards.contract.test.ts`는 `assertIngestionTokenResponseGuardContracts()` async runner만 호출하도록 축소했다.
- Malformed ingestion token list/create/rotate response cases iteration, fetch override/restore flow, API call exercise, and 502 diagnostic fail-closed assertion은 `ingestion-token-response-assertions.ts`가 소유한다.
- Malformed ingestion token response fixtures와 `jsonResponse()` helper는 기존 `ingestion-token-response-guard-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `ingestion-token-response-guards.contract.test.ts`: 5 pure LOC, 6 total LOC
  - `ingestion-token-response-assertions.ts`: 20 pure LOC, 23 total LOC
  - `ingestion-token-response-guard-fixtures.ts`: 54 pure LOC, 56 total LOC
- LSP diagnostics: TypeScript LSP server is not installed in this environment; `npm run lint` (`tsc --noEmit`) passed as the type-check substitute.

## Commits

- `agentfeed-frontend` `9cb1885` — `Move ingestion token response assertions`

## Follow-up

> [!todo]
> Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Current next re-scan candidates: `auth-session-marker.contract.test.ts` and `public-user-strict-stats.contract.test.ts` at 22 pure LOC, followed by `username-check-strict-fields.contract.test.ts` and `dashboard-actions.contract.test.ts` at 21 pure LOC.

> [!todo]
> Keep ingestion token response guard malformed cases and `jsonResponse()` in `ingestion-token-response-guard-fixtures.ts`; keep assertion orchestration in `ingestion-token-response-assertions.ts`.

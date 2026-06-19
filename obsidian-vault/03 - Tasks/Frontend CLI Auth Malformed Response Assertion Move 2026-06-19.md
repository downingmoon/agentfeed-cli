---
title: Frontend CLI Auth Malformed Response Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 CLI auth malformed response assertion move
---

# Frontend CLI Auth Malformed Response Assertion Move 2026-06-19

> [!success]
> `cli-auth-malformed-response.contract.test.ts`의 malformed CLI auth response fail-closed assertion loop를 새 `cli-auth-malformed-response-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/cli-auth-malformed-response.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/cli-auth-malformed-response-assertions.ts`
- 기존 fixture/helper 유지: `agentfeed-frontend/src/lib/cli-auth-malformed-response-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `cli-auth-malformed-response.contract.test.ts`는 `assertCliAuthMalformedResponseContracts()` async runner만 호출하도록 축소했다.
- Malformed CLI auth response cases iteration, fetch override/restore flow, API call exercise, and 502 diagnostic fail-closed assertion은 `cli-auth-malformed-response-assertions.ts`가 소유한다.
- Malformed CLI auth response fixtures는 기존 `cli-auth-malformed-response-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `cli-auth-malformed-response.contract.test.ts`: 4 pure LOC, 5 total LOC
  - `cli-auth-malformed-response-assertions.ts`: 23 pure LOC, 26 total LOC
  - `cli-auth-malformed-response-fixtures.ts`: 110 pure LOC, 112 total LOC

## Commits

- `agentfeed-frontend` `f59a4e7` — `Move CLI auth malformed response assertions`

## Follow-up

> [!todo]
> Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Candidate `public-user-strict-stats.contract.test.ts` handled in [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]. Current next re-scan candidates: `username-check-strict-fields.contract.test.ts` and `dashboard-actions.contract.test.ts` at 21 pure LOC, followed by `collection-evidence.contract.test.ts`, `account-strict-fields.contract.test.ts`, and `feed-filter-keyboard.contract.test.ts` at 19 pure LOC.

> [!todo]
> Keep malformed CLI auth response fixtures in `cli-auth-malformed-response-fixtures.ts` and assertion orchestration in `cli-auth-malformed-response-assertions.ts`.

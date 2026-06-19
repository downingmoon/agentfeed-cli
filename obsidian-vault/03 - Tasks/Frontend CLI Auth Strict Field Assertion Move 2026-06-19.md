---
title: Frontend CLI Auth Strict Field Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 CLI auth strict field assertion move
---

# Frontend CLI Auth Strict Field Assertion Move 2026-06-19

> [!success]
> `cli-auth-strict-fields.contract.test.ts`의 CLI auth session/approve strict-field preservation and fail-closed assertions를 새 `cli-auth-strict-field-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/cli-auth-strict-fields.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/cli-auth-strict-field-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 작업 단위 자체에서는 없음. 사용자 요청 1회 예외 배포는 작업 완료 후 별도 실행/검증한다.
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `cli-auth-strict-fields.contract.test.ts`는 `assertCliAuthStrictFieldContracts()` runner만 호출하도록 축소했다.
- Valid CLI auth session semantics, valid approve semantics, session extra-field fail-closed behavior, and approve extra-field fail-closed behavior는 `cli-auth-strict-field-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `cli-auth-strict-fields.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `cli-auth-strict-field-assertions.ts`: 36 pure LOC, 41 total LOC

## Commits

- `agentfeed-frontend` `924dd48` — `Move CLI auth strict field assertions`

## Follow-up

> [!todo]
> [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-response-contracts.contract.test.ts` handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Candidate `public-user-strict-stats.contract.test.ts` handled in [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]. Candidate `username-check-strict-fields.contract.test.ts` handled in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]. Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Current next re-scan candidate: `collection-evidence.contract.test.ts` at 19 pure LOC, followed by `account-strict-fields.contract.test.ts` and `feed-filter-keyboard.contract.test.ts` at 19 pure LOC.

> [!todo]
> Keep CLI auth strict-field assertion orchestration in `cli-auth-strict-field-assertions.ts`.

---
title: Frontend Project Stats Strict Field Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 Project stats strict field assertion move
---

# Frontend Project Stats Strict Field Assertion Move 2026-06-19

> [!success]
> `project-stats-strict-fields.contract.test.ts`의 project stats preservation and malformed stats fail-closed assertions를 새 `project-stats-strict-field-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/project-stats-strict-fields.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/project-stats-strict-field-assertions.ts`
- 기존 fixture/helper 유지: `agentfeed-frontend/src/lib/project-stats-strict-fields-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `project-stats-strict-fields.contract.test.ts`는 `assertProjectStatsStrictFieldContracts()` async runner만 호출하도록 축소했다.
- Exact backend `ProjectStats` field preservation, malformed project stats fail-closed checks, and fetch override/restore flow는 `project-stats-strict-field-assertions.ts`가 소유한다.
- Valid/malformed project stats fixtures and API response helper는 기존 `project-stats-strict-fields-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `project-stats-strict-fields.contract.test.ts`: 5 pure LOC, 6 total LOC
  - `project-stats-strict-field-assertions.ts`: 29 pure LOC, 32 total LOC
  - `project-stats-strict-fields-fixtures.ts`: 46 pure LOC, 48 total LOC

## Commits

- `agentfeed-frontend` `c6beac7` — `Move project stats strict field assertions`

## Follow-up

> [!todo]
> [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-response-contracts.contract.test.ts` handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Candidate `public-user-strict-stats.contract.test.ts` handled in [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]. Candidate `username-check-strict-fields.contract.test.ts` handled in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]. Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Current next re-scan candidate: `owner-project-detail-contracts.contract.test.ts` at 9 pure LOC.

> [!todo]
> Keep project stats fixtures/API response helper in `project-stats-strict-fields-fixtures.ts` and assertion orchestration in `project-stats-strict-field-assertions.ts`.

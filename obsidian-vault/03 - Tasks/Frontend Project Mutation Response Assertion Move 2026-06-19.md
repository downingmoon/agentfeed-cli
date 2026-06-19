---
title: Frontend Project Mutation Response Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 Project mutation response assertion move
---

# Frontend Project Mutation Response Assertion Move 2026-06-19

> [!success]
> `project-mutation-response-contracts.contract.test.ts`의 project mutation unexpected backend response field fail-closed assertion을 새 `project-mutation-response-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/project-mutation-response-contracts.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/project-mutation-response-assertions.ts`
- 기존 fixture/helper 유지: `agentfeed-frontend/src/lib/project-mutation-response-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `project-mutation-response-contracts.contract.test.ts`는 `assertProjectMutationResponseContracts()` async runner만 호출하도록 축소했다.
- Project mutation response JSON helper, fetch override/restore flow, `projects.create(...)` exercise, and unexpected backend project mutation response field fail-closed assertion은 `project-mutation-response-assertions.ts`가 소유한다.
- Project mutation payload fixture는 기존 `project-mutation-response-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `project-mutation-response-contracts.contract.test.ts`: 5 pure LOC, 6 total LOC
  - `project-mutation-response-assertions.ts`: 25 pure LOC, 27 total LOC
  - `project-mutation-response-fixtures.ts`: 35 pure LOC, 35 total LOC

## Commits

- `agentfeed-frontend` `2865573` — `Move project mutation response assertions`

## Follow-up

> [!todo]
> [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Candidate `public-user-strict-stats.contract.test.ts` handled in [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]. Candidate `username-check-strict-fields.contract.test.ts` handled in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]. Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Current next re-scan candidate: `collection-evidence-malformed.contract.test.ts` at 9 pure LOC.

> [!todo]
> Keep project mutation response fixtures in `project-mutation-response-fixtures.ts` and assertion orchestration in `project-mutation-response-assertions.ts`.

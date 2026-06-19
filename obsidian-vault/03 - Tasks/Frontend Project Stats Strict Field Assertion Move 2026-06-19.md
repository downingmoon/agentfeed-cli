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
> [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. Current next re-scan candidate: `project-mutation-response-contracts.contract.test.ts` at 29 pure LOC.

> [!todo]
> Keep project stats fixtures/API response helper in `project-stats-strict-fields-fixtures.ts` and assertion orchestration in `project-stats-strict-field-assertions.ts`.

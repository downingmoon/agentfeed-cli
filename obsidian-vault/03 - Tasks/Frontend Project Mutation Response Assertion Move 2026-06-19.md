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
> Current next re-scan candidate: `cli-auth-malformed-response.contract.test.ts` at 26 pure LOC, followed by `ingestion-token-response-guards.contract.test.ts` at 25 pure LOC and `worklog-detail-response-guards.contract.test.ts` at 24 pure LOC.

> [!todo]
> Keep project mutation response fixtures in `project-mutation-response-fixtures.ts` and assertion orchestration in `project-mutation-response-assertions.ts`.

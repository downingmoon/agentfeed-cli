---
title: Frontend Explore Strict Field Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 Explore strict field assertion move
---

# Frontend Explore Strict Field Assertion Move 2026-06-19

> [!success]
> `explore-strict-fields.contract.test.ts`의 explore section strict-field preservation and fail-closed assertions를 새 `explore-strict-field-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/explore-strict-fields.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/explore-strict-field-assertions.ts`
- 기존 fixture/helper 유지: `agentfeed-frontend/src/lib/explore-strict-fields-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `explore-strict-fields.contract.test.ts`는 `assertExploreStrictFieldContracts()` runner만 호출하도록 축소했다.
- Explore section valid normalization, top-level extra-field rejection, trending project extra-field rejection, popular prompt extra-field rejection, and featured category extra-field rejection은 `explore-strict-field-assertions.ts`가 소유한다.
- Explore strict-field fixtures는 기존 `explore-strict-fields-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `explore-strict-fields.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `explore-strict-field-assertions.ts`: 35 pure LOC, 38 total LOC
  - `explore-strict-fields-fixtures.ts`: 113 pure LOC, 119 total LOC

## Commits

- `agentfeed-frontend` `7fd6ec2` — `Move explore strict field assertions`

## Follow-up

> [!todo]
> Current next re-scan candidate: `header-logic.contract.test.ts` at 32 pure LOC, followed by `project-mutation-response-contracts.contract.test.ts` at 29 pure LOC and `cli-auth-malformed-response.contract.test.ts` at 26 pure LOC.

> [!todo]
> Keep explore strict-field fixtures in `explore-strict-fields-fixtures.ts` and assertion orchestration in `explore-strict-field-assertions.ts`.

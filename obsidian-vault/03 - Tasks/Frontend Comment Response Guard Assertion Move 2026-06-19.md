---
title: Frontend Comment Response Guard Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 Comment response guard assertion move
---

# Frontend Comment Response Guard Assertion Move 2026-06-19

> [!success]
> `comment-response-guards.contract.test.ts`의 valid comment list preservation, public author metadata, pagination, and malformed comment fail-closed assertions를 새 `comment-response-guard-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/comment-response-guards.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/comment-response-guard-assertions.ts`
- 기존 fixture/helper 유지: `agentfeed-frontend/src/lib/comment-response-guard-fixtures.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 이 contract refactor 문서화 단위에서는 수행하지 않음. 사용자 요청 1회 예외 배포는 [[Personal Server Deploy One-off Refresh 2026-06-19]]에 별도 기록.
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `comment-response-guards.contract.test.ts`는 `assertCommentResponseGuardContracts()` async runner만 호출하도록 축소했다.
- Valid comment list field preservation, public author metadata mapping, pagination preservation, malformed comment cases fail-closed behavior는 `comment-response-guard-assertions.ts`가 소유한다.
- Comment author/list/malformed fixtures and JSON response helper는 기존 `comment-response-guard-fixtures.ts`에 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- Current re-check: `npm run test:contracts` ✅
- After edit/current re-check: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `comment-response-guards.contract.test.ts`: 5 pure LOC, 6 total LOC
  - `comment-response-guard-assertions.ts`: 32 pure LOC, 34 total LOC
  - `comment-response-guard-fixtures.ts`: 51 pure LOC, 56 total LOC

## Commits

- `agentfeed-frontend` `88df6ff` — `Move comment response guard assertions`

## Follow-up

> [!todo]
> [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. Current next re-scan candidate: `header-logic.contract.test.ts` at 32 pure LOC.

> [!todo]
> Keep comment response fixtures/malformed cases in `comment-response-guard-fixtures.ts` and assertion orchestration in `comment-response-guard-assertions.ts`.

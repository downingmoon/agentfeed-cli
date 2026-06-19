---
title: Frontend Worklog Review Publish Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 Worklog review publish assertion move
---

# Frontend Worklog Review Publish Assertion Move 2026-06-19

> [!success]
> `worklog-review-publish.contract.test.ts`의 review publish stale-refresh, fail-closed privacy scan, and unsafe parser guard assertions를 새 `worklog-review-publish-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/worklog-review-publish.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/worklog-review-publish-assertions.ts`
- 성격: contract-test runner slimming / source contract assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI source contract-test refactor라 생략

## Changes

- `worklog-review-publish.contract.test.ts`는 `assertWorklogReviewPublishContracts()` runner만 호출하도록 축소했다.
- Worklog review publish stale re-fetch ordering, refreshed privacy finding/preview safety recomputation, stale-invalid UI update/status, missing/malformed privacy scan fail-closed behavior, and unsafe parser assertion bans는 `worklog-review-publish-assertions.ts`가 소유한다.
- Source inspection 대상은 기존처럼 `WorklogReviewPage.tsx`와 `worklog-review-validation.ts`를 유지했다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `worklog-review-publish.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `worklog-review-publish-assertions.ts`: 36 pure LOC, 42 total LOC

## Commits

- `agentfeed-frontend` `f71e1e3` — `Move worklog review publish assertions`

## Follow-up

> [!todo]
> [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. Current next re-scan candidate: `project-mutation-response-contracts.contract.test.ts` at 29 pure LOC.

> [!todo]
> Keep worklog review publish source assertions in `worklog-review-publish-assertions.ts`.

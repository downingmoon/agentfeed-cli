---
title: Frontend List Merge Contract Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 List merge contract assertion move
---

# Frontend List Merge Contract Assertion Move 2026-06-19

> [!success]
> `list-merge-contracts.contract.test.ts`의 list merge and project result key assertions를 새 `list-merge-contract-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/list-merge-contracts.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/list-merge-contract-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `list-merge-contracts.contract.test.ts`는 `assertListMergeContracts()` runner만 호출하도록 축소했다.
- `uniqueBy`, `appendUniqueBy`, within-page duplicate handling, project pagination dedupe key, project result key owner/id fallback assertions는 `list-merge-contract-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `list-merge-contracts.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `list-merge-contract-assertions.ts`: 38 pure LOC, 45 total LOC

## Commits

- `agentfeed-frontend` `7b8847e` — `Move list merge contract assertions`

## Follow-up

> [!todo]
> [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. Current next re-scan candidate: `explore-strict-fields.contract.test.ts` at 33 pure LOC.

> [!todo]
> Keep list merge and project result key contract assertions in `list-merge-contract-assertions.ts`.

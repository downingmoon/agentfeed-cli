---
title: Frontend Project Mutation Form Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - refactor
status: done
aliases:
  - 2026-06-19 Project mutation form assertion move
---

# Frontend Project Mutation Form Assertion Move 2026-06-19

> [!success]
> `project-mutation-form-contracts.contract.test.ts`의 create/update form serializer and nullable clear semantics assertions를 새 `project-mutation-form-assertions.ts`로 이동했다.

## Scope

- 대상: `agentfeed-frontend/src/lib/project-mutation-form-contracts.contract.test.ts`
- 신규 helper: `agentfeed-frontend/src/lib/project-mutation-form-assertions.ts`
- 성격: contract-test runner slimming / assertion ownership split
- 신규 런타임 기능: 없음
- 서버/인프라/CI/CD 변경: 없음
- 서버 배포: 없음
- Visual QA: 비-UI contract-test refactor라 생략

## Changes

- `project-mutation-form-contracts.contract.test.ts`는 `assertProjectMutationFormContracts()` runner만 호출하도록 축소했다.
- `UpdateProjectBody` nullable-field compatibility, create form blank optional field omission, update form explicit null clear semantics, cleared tags `[]` assertions는 `project-mutation-form-assertions.ts`가 소유한다.
- `scripts/contract-test-sources.mjs`는 변경하지 않았다. 신규 파일은 imported assertion/helper module이고 standalone contract source가 아니다.

## Verification Evidence

- Baseline before edit: `npm run test:contracts` ✅
- After edit: `npm run test:contracts` ✅
- After edit: `npm run lint` ✅ — `tsc --noEmit`
- `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions in changed frontend TS files.
- Pure LOC:
  - `project-mutation-form-contracts.contract.test.ts`: 2 pure LOC, 3 total LOC
  - `project-mutation-form-assertions.ts`: 38 pure LOC, 41 total LOC

## Commits

- `agentfeed-frontend` `e7a9127` — `Move project mutation form assertions`

## Follow-up

> [!todo]
> [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. Current next re-scan candidate: `cli-auth-strict-fields.contract.test.ts` at 34 pure LOC.

> [!todo]
> Keep project mutation form serializer/null-clear semantics assertions in `project-mutation-form-assertions.ts`.

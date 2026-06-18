---
title: Frontend User Account Response Guard Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - account
  - enterprise-readiness
status: done
---

# Frontend User Account Response Guard Assertion Move 2026-06-18

## Context

The post-dashboard strict-field re-scan showed `agentfeed-frontend/src/lib/user-account-response-guards.contract.test.ts` as the next remaining contract-test candidate at 55 pure LOC. The fixture module already owned payloads, malformed user/account cases, and the JSON response helper; the runner still owned the assertion harness.

## Changed

- Moved valid username/public-user preservation assertions, malformed response fail-closed assertions, and fetch restore handling into `src/lib/user-account-response-guard-fixtures.ts`.
- Reduced `src/lib/user-account-response-guards.contract.test.ts` to invoking `assertUserAccountResponseGuardContracts()` with its async failure handler.
- Preserved existing user/account response guard behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because no standalone contract source was added.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/user-account-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/user-account-response-guard-fixtures.ts`: 115 lines / 108 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `93f7b69` — `Move user account guard assertions`

## Follow-up

- Keep user/account guard payloads, malformed cases, and assertion harness in `user-account-response-guard-fixtures.ts`.
- [x] Next re-scan candidate `worklog-review-url-scope.contract.test.ts` handled in [[Frontend Worklog Review URL Scope Fixture Split 2026-06-18]]. Remaining next re-scan candidate: `api-request-contracts.contract.test.ts` at 54 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

---
title: Frontend Account Project Mutation Response Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed
  - frontend
  - contract
  - account
  - project
  - enterprise-readiness
status: done
---

# Frontend Account Project Mutation Response Assertion Move 2026-06-19

## Context

The post-worklog-action assertion move re-scan showed `agentfeed-frontend/src/lib/account-project-mutation-response-guards.contract.test.ts` as the largest remaining contract test at 41 pure LOC. It already used malformed account/project mutation fixtures from `account-project-mutation-response-fixtures.ts`, but still owned response wrapping, account/project API action dispatch, fetch override/restore handling, and fail-closed assertion flow directly in the runner.

## Changed

- Added `src/lib/account-project-mutation-response-assertions.ts` for response helper setup, account/project mutation action dispatch, fetch restore handling, and fail-closed assertion flow.
- Reduced `src/lib/account-project-mutation-response-guards.contract.test.ts` to invoking `assertAccountProjectMutationResponseGuards()` with the existing async failure handler.
- Kept `src/lib/account-project-mutation-response-fixtures.ts` unchanged at 60 pure LOC.
- Preserved existing account/project mutation malformed response guard coverage without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported assertion/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/account-project-mutation-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/account-project-mutation-response-assertions.ts`: 50 lines / 45 pure LOC
  - `src/lib/account-project-mutation-response-fixtures.ts`: unchanged 63 lines / 60 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `c4e80b5` — `Move account project mutation response assertions`

## Follow-up

- Keep account/project mutation malformed response assertion flow in `account-project-mutation-response-assertions.ts`.
- Keep account/project mutation malformed cases in `account-project-mutation-response-fixtures.ts`.
- [x] Tied next re-scan candidate `moderation-report-contracts.contract.test.ts` handled in [[Frontend Moderation Report Contract Assertion Move 2026-06-19]]. [x] Remaining next re-scan candidate `leaderboard-user-key.contract.test.ts` handled in [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]. [x] Candidate `worklog-author-avatar.contract.test.ts` handled in [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]. [x] Candidate `privacy-scan-strict-fields.contract.test.ts` handled in [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-validation.contract.test.ts` handled in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. [x] Candidate `worklog-card-adapter.contract.test.ts` handled in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. [x] Candidate `list-merge-contracts.contract.test.ts` handled in [[Frontend List Merge Contract Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-response-contracts.contract.test.ts` handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Current next re-scan candidate: `worklog-detail-response-guards.contract.test.ts` at 24 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work and server deployment remain held by the active goal constraint.

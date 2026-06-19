---
title: Frontend API Fetch Request Hardening Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api-fetch
  - enterprise-readiness
status: done
---

# Frontend API Fetch Request Hardening Assertion Move 2026-06-18

## Context

The post-social-action assertion move re-scan showed `agentfeed-frontend/src/lib/api-fetch-request-hardening.contract.test.ts` as the largest remaining contract test at 42 pure LOC. It already used response/header-case fixtures from `api-fetch-request-hardening-fixtures.ts`, but still owned JSON response setup, API action dispatch, fetch interception, and table-driven header assertions directly in the runner.

## Changed

- Added `src/lib/api-fetch-request-hardening-assertions.ts` for JSON response setup, API action dispatch, fetch restore handling, request header capture, and Content-Type/CSRF intent assertions.
- Reduced `src/lib/api-fetch-request-hardening.contract.test.ts` to invoking `assertApiFetchRequestHardeningContracts()` with the existing async failure handler.
- Kept `src/lib/api-fetch-request-hardening-fixtures.ts` unchanged at 60 pure LOC.
- Preserved existing API fetch request header hardening coverage without runtime app changes.
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
  - `src/lib/api-fetch-request-hardening.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/api-fetch-request-hardening-assertions.ts`: 49 lines / 44 pure LOC
  - `src/lib/api-fetch-request-hardening-fixtures.ts`: unchanged 64 lines / 60 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `68328f6` — `Move API fetch request hardening assertions`

## Follow-up

- Keep API fetch request hardening assertion flow in `api-fetch-request-hardening-assertions.ts`.
- Keep API fetch request header scenarios and response stubs in `api-fetch-request-hardening-fixtures.ts`.
- [x] Tied next re-scan candidate `worklog-action-malformed-response-guards.contract.test.ts` handled in [[Frontend Worklog Action Malformed Response Assertion Move 2026-06-18]]. [x] Remaining next re-scan candidate `account-project-mutation-response-guards.contract.test.ts` handled in [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]. Candidate `moderation-report-contracts.contract.test.ts` handled in [[Frontend Moderation Report Contract Assertion Move 2026-06-19]]. Candidate `leaderboard-user-key.contract.test.ts` handled in [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]. [x] Candidate `worklog-author-avatar.contract.test.ts` handled in [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]. [x] Candidate `privacy-scan-strict-fields.contract.test.ts` handled in [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-validation.contract.test.ts` handled in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. [x] Candidate `worklog-card-adapter.contract.test.ts` handled in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. [x] Candidate `list-merge-contracts.contract.test.ts` handled in [[Frontend List Merge Contract Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. Current next re-scan candidate: `project-mutation-response-contracts.contract.test.ts` at 29 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

---
title: Frontend API Surface Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api-surface
  - enterprise-readiness
status: done
---

# Frontend API Surface Fixture Split 2026-06-18

## Context

The post-project-schema-variant malformed assertion move re-scan showed `agentfeed-frontend/src/lib/api-surface-contracts.contract.test.ts` tied as the largest remaining contract test at 47 pure LOC. It still owned direct worklog mutation shape checks, route-client availability checks, search type coverage, and settings token shape smoke assertions directly in the runner.

## Changed

- Added `src/lib/api-surface-contract-fixtures.ts` for direct worklog body checks, route-client availability checks, search type coverage, and settings token shape assertions.
- Reduced `src/lib/api-surface-contracts.contract.test.ts` to invoking `assertApiSurfaceContracts()`.
- Preserved existing API surface contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-surface-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/api-surface-contract-fixtures.ts`: 71 lines / 61 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `c029f78` — `Split API surface contract fixtures`

## Follow-up

- Keep API surface checks in `api-surface-contract-fixtures.ts`.
- [x] Remaining next re-scan candidate `read-side-strict-fields.contract.test.ts` handled in [[Frontend Read Side Strict Field Fixture Split 2026-06-18]]. Subsequent candidates `api-pagination-request-contracts.contract.test.ts`, `worklog-metric-evidence.contract.test.ts`, `project-schema-variants-strict-fields.contract.test.ts`, `auth-next-contracts.contract.test.ts`, `worklog-review-strict-fields.contract.test.ts`, `project-malformed-response-contracts.contract.test.ts`, `leaderboard-response-contracts.contract.test.ts`, and `worklog-card-response-guards.contract.test.ts` handled in [[Frontend API Pagination Request Fixture Split 2026-06-18]], [[Frontend Worklog Metric Evidence Fixture Split 2026-06-18]], [[Frontend Project Schema Variant Strict Assertion Move 2026-06-18]], [[Frontend Auth Next Assertion Move 2026-06-18]], [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]], [[Frontend Project Malformed Response Assertion Move 2026-06-18]], [[Frontend Leaderboard Response Assertion Move 2026-06-18]], and [[Frontend Worklog Card Response Assertion Move 2026-06-18]]. Tied candidate `social-action-response-guards.contract.test.ts` handled in [[Frontend Social Action Response Assertion Move 2026-06-18]]. Candidate `api-fetch-request-hardening.contract.test.ts` handled in [[Frontend API Fetch Request Hardening Assertion Move 2026-06-18]]. Candidate `worklog-action-malformed-response-guards.contract.test.ts` handled in [[Frontend Worklog Action Malformed Response Assertion Move 2026-06-18]]. Candidate `account-project-mutation-response-guards.contract.test.ts` handled in [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]. Candidate `moderation-report-contracts.contract.test.ts` handled in [[Frontend Moderation Report Contract Assertion Move 2026-06-19]]. Candidate `leaderboard-user-key.contract.test.ts` handled in [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]. [x] Candidate `worklog-author-avatar.contract.test.ts` handled in [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]. [x] Candidate `privacy-scan-strict-fields.contract.test.ts` handled in [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-validation.contract.test.ts` handled in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. [x] Candidate `worklog-card-adapter.contract.test.ts` handled in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. [x] Candidate `list-merge-contracts.contract.test.ts` handled in [[Frontend List Merge Contract Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. Current next re-scan candidate: `explore-strict-fields.contract.test.ts` at 33 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

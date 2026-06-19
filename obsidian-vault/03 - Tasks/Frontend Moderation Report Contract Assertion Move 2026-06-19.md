---
title: Frontend Moderation Report Contract Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed
  - frontend
  - contract
  - moderation
  - enterprise-readiness
status: done
---

# Frontend Moderation Report Contract Assertion Move 2026-06-19

## Context

The post-account/project mutation assertion move re-scan showed `agentfeed-frontend/src/lib/moderation-report-contracts.contract.test.ts` tied as the largest remaining contract test at 40 pure LOC. It already used request/response fixtures from `moderation-report-contract-fixtures.ts`, but still owned moderation API exercise calls, response unwrap assertions, request count assertions, and request method/path/query/body assertions directly in the runner.

## Changed

- Added `src/lib/moderation-report-contract-assertions.ts` for moderation list/status-update API exercise calls, response unwrap assertions, request count assertions, and request method/path/query/body assertions.
- Reduced `src/lib/moderation-report-contracts.contract.test.ts` to invoking `assertModerationReportContracts()` with the existing async failure handler.
- Kept `src/lib/moderation-report-contract-fixtures.ts` unchanged at 54 pure LOC.
- Preserved existing moderation report client contract coverage without runtime app changes.
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
  - `src/lib/moderation-report-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/moderation-report-contract-assertions.ts`: 49 lines / 43 pure LOC
  - `src/lib/moderation-report-contract-fixtures.ts`: unchanged 59 lines / 54 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `ce0e84e` — `Move moderation report contract assertions`

## Follow-up

- Keep moderation report assertion flow in `moderation-report-contract-assertions.ts`.
- Keep moderation report request/response fixtures in `moderation-report-contract-fixtures.ts`.
- [x] Remaining next re-scan candidate `leaderboard-user-key.contract.test.ts` handled in [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]. [x] Candidate `worklog-author-avatar.contract.test.ts` handled in [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]. [x] Candidate `privacy-scan-strict-fields.contract.test.ts` handled in [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-validation.contract.test.ts` handled in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. [x] Candidate `worklog-card-adapter.contract.test.ts` handled in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. [x] Candidate `list-merge-contracts.contract.test.ts` handled in [[Frontend List Merge Contract Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-response-contracts.contract.test.ts` handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Current next re-scan candidate: `ingestion-token-response-guards.contract.test.ts` at 25 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work and server deployment remain held by the active goal constraint.

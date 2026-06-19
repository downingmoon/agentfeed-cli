---
title: Frontend Social Action Response Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - social
  - enterprise-readiness
status: done
---

# Frontend Social Action Response Assertion Move 2026-06-18

## Context

The post-worklog-card assertion move re-scan showed `agentfeed-frontend/src/lib/social-action-response-guards.contract.test.ts` tied as the largest remaining contract test at 42 pure LOC. It still owned malformed like/bookmark/follow cases, response wrapping, fetch override/restore handling, and fail-closed assertion flow directly in the runner.

## Changed

- Added `src/lib/social-action-response-assertions.ts` for malformed like/bookmark/follow cases, response helper setup, fetch restore handling, and fail-closed assertion flow.
- Reduced `src/lib/social-action-response-guards.contract.test.ts` to invoking `assertSocialActionResponseGuards()` with the existing async failure handler.
- Preserved existing social action response guard coverage without runtime app changes.
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
  - `src/lib/social-action-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/social-action-response-assertions.ts`: 57 lines / 51 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `6d35463` — `Move social action response assertions`

## Follow-up

- Keep social action malformed response assertion flow in `social-action-response-assertions.ts`.
- [x] Remaining next re-scan candidate `api-fetch-request-hardening.contract.test.ts` handled in [[Frontend API Fetch Request Hardening Assertion Move 2026-06-18]]. Candidate `worklog-action-malformed-response-guards.contract.test.ts` handled in [[Frontend Worklog Action Malformed Response Assertion Move 2026-06-18]]. Candidate `account-project-mutation-response-guards.contract.test.ts` handled in [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]. Candidate `moderation-report-contracts.contract.test.ts` handled in [[Frontend Moderation Report Contract Assertion Move 2026-06-19]]. Candidate `leaderboard-user-key.contract.test.ts` handled in [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]. [x] Candidate `worklog-author-avatar.contract.test.ts` handled in [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]. [x] Candidate `privacy-scan-strict-fields.contract.test.ts` handled in [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-validation.contract.test.ts` handled in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. [x] Candidate `worklog-card-adapter.contract.test.ts` handled in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. [x] Candidate `list-merge-contracts.contract.test.ts` handled in [[Frontend List Merge Contract Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-response-contracts.contract.test.ts` handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Candidate `public-user-strict-stats.contract.test.ts` handled in [[Frontend Public User Strict Stats Assertion Move 2026-06-19]]. Candidate `username-check-strict-fields.contract.test.ts` handled in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]]. Candidate `dashboard-actions.contract.test.ts` handled in [[Frontend Dashboard Action Assertion Move 2026-06-19]]. Candidate `collection-evidence.contract.test.ts` handled in [[Frontend Collection Evidence Assertion Move 2026-06-19]]. Candidate `account-strict-fields.contract.test.ts` handled in [[Frontend Account Strict Field Assertion Move 2026-06-19]]. Candidate `feed-filter-keyboard.contract.test.ts` handled in [[Frontend Feed Filter Keyboard Assertion Move 2026-06-19]]. Candidate `worklog-card-malformed-adapter.contract.test.ts` handled in [[Frontend Worklog Card Malformed Adapter Assertion Move 2026-06-19]]. Candidate `owner-project-detail-contracts.contract.test.ts` handled in [[Frontend Owner Project Detail Assertion Move 2026-06-19]]. Current next re-scan candidate: `collection-evidence-malformed.contract.test.ts` at 9 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

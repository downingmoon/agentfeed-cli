---
title: Frontend Leaderboard User Key Assertion Move 2026-06-19
date: 2026-06-19
tags:
  - agentfeed
  - frontend
  - contract
  - leaderboard
  - enterprise-readiness
status: done
---

# Frontend Leaderboard User Key Assertion Move 2026-06-19

## Context

The post-moderation-report assertion move re-scan showed `agentfeed-frontend/src/lib/leaderboard-user-key.contract.test.ts` as the largest remaining contract test at 40 pure LOC. It still owned the malformed leaderboard row fixture and fail-closed identity assertion directly in the runner.

## Changed

- Added `src/lib/leaderboard-user-key-assertions.ts` for the malformed leaderboard row fixture and missing-identity fail-closed assertion.
- Reduced `src/lib/leaderboard-user-key.contract.test.ts` to invoking `assertLeaderboardUserKeyContracts()`.
- Preserved existing leaderboard user-key fail-closed coverage without runtime app changes.
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
  - `src/lib/leaderboard-user-key.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/leaderboard-user-key-assertions.ts`: 47 lines / 44 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `8bb046d` — `Move leaderboard user key assertions`

## Follow-up

- Keep leaderboard user-key fail-closed assertion flow in `leaderboard-user-key-assertions.ts`.
- [x] Candidate `worklog-author-avatar.contract.test.ts` handled in [[Frontend Worklog Author Avatar Assertion Move 2026-06-19]]. [x] Candidate `privacy-scan-strict-fields.contract.test.ts` handled in [[Frontend Privacy Scan Strict Field Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-validation.contract.test.ts` handled in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. [x] Candidate `worklog-card-adapter.contract.test.ts` handled in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. [x] Candidate `list-merge-contracts.contract.test.ts` handled in [[Frontend List Merge Contract Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-form-contracts.contract.test.ts` handled in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. [x] Candidate `comment-response-guards.contract.test.ts` handled in [[Frontend Comment Response Guard Assertion Move 2026-06-19]]. [x] Candidate `worklog-review-publish.contract.test.ts` handled in [[Frontend Worklog Review Publish Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-strict-fields.contract.test.ts` handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]. [x] Candidate `project-stats-strict-fields.contract.test.ts` handled in [[Frontend Project Stats Strict Field Assertion Move 2026-06-19]]. [x] Candidate `explore-strict-fields.contract.test.ts` handled in [[Frontend Explore Strict Field Assertion Move 2026-06-19]]. [x] Candidate `header-logic.contract.test.ts` handled in [[Frontend Header Logic Assertion Move 2026-06-19]]. [x] Candidate `project-mutation-response-contracts.contract.test.ts` handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]. [x] Candidate `cli-auth-malformed-response.contract.test.ts` handled in [[Frontend CLI Auth Malformed Response Assertion Move 2026-06-19]]. Candidate `ingestion-token-response-guards.contract.test.ts` handled in [[Frontend Ingestion Token Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-response-guards.contract.test.ts` handled in [[Frontend Worklog Detail Response Assertion Move 2026-06-19]]. Candidate `worklog-detail-adapter.contract.test.ts` handled in [[Frontend Worklog Detail Adapter Assertion Move 2026-06-19]]. Candidate `select-value-parsers.contract.test.ts` handled in [[Frontend Select Value Parser Assertion Move 2026-06-19]]. Candidate `api-error-list-contracts.contract.test.ts` handled in [[Frontend API Error List Assertion Move 2026-06-19]]. Candidate `auth-session-marker.contract.test.ts` handled in [[Frontend Auth Session Marker Assertion Move 2026-06-19]]. Current next re-scan candidate: `public-user-strict-stats.contract.test.ts` at 22 pure LOC, followed by `username-check-strict-fields.contract.test.ts` and `dashboard-actions.contract.test.ts` at 21 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work and server deployment remain held by the active goal constraint.

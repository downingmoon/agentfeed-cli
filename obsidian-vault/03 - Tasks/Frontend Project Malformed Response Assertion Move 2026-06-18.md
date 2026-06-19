---
title: Frontend Project Malformed Response Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Malformed Response Assertion Move 2026-06-18

## Context

The post-worklog-review strict-field assertion move re-scan showed `agentfeed-frontend/src/lib/project-malformed-response-contracts.contract.test.ts` as the largest remaining contract test at 44 pure LOC. It already used malformed project response cases from `project-response-fixtures.ts`, but still owned response helper setup, API action dispatch, fetch wiring, and fail-closed assertion flow directly in the runner.

`src/lib/project-response-fixtures.ts` was already 150 pure LOC, so this pass intentionally avoided growing that shared fixture file.

## Changed

- Added `src/lib/project-malformed-response-assertions.ts` for mocked response helper, project action dispatch, fetch wiring, and malformed project fail-closed assertion flow.
- Reduced `src/lib/project-malformed-response-contracts.contract.test.ts` to invoking `assertProjectMalformedResponseContracts()` with the existing async failure handler.
- Kept `src/lib/project-response-fixtures.ts` unchanged at 150 pure LOC.
- Preserved existing project malformed response coverage without runtime app changes.
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
  - `src/lib/project-malformed-response-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/project-malformed-response-assertions.ts`: 51 lines / 45 pure LOC
  - `src/lib/project-response-fixtures.ts`: unchanged 159 lines / 150 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `c46583c` — `Move project malformed response assertions`

## Follow-up

- Keep project malformed response assertion flow in `project-malformed-response-assertions.ts`.
- Keep project response fixtures and malformed cases in `project-response-fixtures.ts`; re-check size before adding cases because it is 150 pure LOC.
- [x] Tied next re-scan candidate `leaderboard-response-contracts.contract.test.ts` handled in [[Frontend Leaderboard Response Assertion Move 2026-06-18]]. Subsequent candidate `worklog-card-response-guards.contract.test.ts` handled in [[Frontend Worklog Card Response Assertion Move 2026-06-18]]. Tied candidate `social-action-response-guards.contract.test.ts` handled in [[Frontend Social Action Response Assertion Move 2026-06-18]]. Candidate `api-fetch-request-hardening.contract.test.ts` handled in [[Frontend API Fetch Request Hardening Assertion Move 2026-06-18]]. Candidate `worklog-action-malformed-response-guards.contract.test.ts` handled in [[Frontend Worklog Action Malformed Response Assertion Move 2026-06-18]]. Candidate `account-project-mutation-response-guards.contract.test.ts` handled in [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]. Candidate `moderation-report-contracts.contract.test.ts` handled in [[Frontend Moderation Report Contract Assertion Move 2026-06-19]]. Candidate `leaderboard-user-key.contract.test.ts` handled in [[Frontend Leaderboard User Key Assertion Move 2026-06-19]]. Current next re-scan candidates: `worklog-author-avatar.contract.test.ts` and `privacy-scan-strict-fields.contract.test.ts` at 39 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

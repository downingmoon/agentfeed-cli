---
title: Frontend Worklog Review Action Case Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - worklog
  - review
  - enterprise-readiness
status: done
---

# Frontend Worklog Review Action Case Move 2026-06-17

## Context

After the ingestion token response guard fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/worklog-review-action-contracts.contract.test.ts` tied as the largest frontend contract file at 75 pure LOC. It already used `worklog-review-action-contract-fixtures.ts`, but unpublish, comment-submit, and publish-control action cases were still inline as repeated assertions.

## Changed

- Moved unpublish-control, comment-submit, and publish-control cases into existing `src/lib/worklog-review-action-contract-fixtures.ts`.
- Kept `src/lib/worklog-review-action-contracts.contract.test.ts` focused on iterating action cases, preview safety checks, and fail-closed malformed privacy finding behavior.
- Preserved existing worklog review action contract behavior without runtime app changes.
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
  - `src/lib/worklog-review-action-contracts.contract.test.ts`: 61 lines / 50 pure LOC
  - `src/lib/worklog-review-action-contract-fixtures.ts`: 157 lines / 150 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `01bbfa7` — `Move worklog review action cases`

## Follow-up

- [x] Follow-up shrink handled in [[Frontend Worklog Review Action Assertion Helper Split 2026-06-18]]; action cases remain in `worklog-review-action-contract-fixtures.ts`, while assertion flow now belongs in `worklog-review-action-contract-assertions.ts`.
- Re-scan found `worklog-card-adapter.contract.test.ts` tied as the largest contract file and moved expectations in [[Frontend Worklog Card Adapter Expectation Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

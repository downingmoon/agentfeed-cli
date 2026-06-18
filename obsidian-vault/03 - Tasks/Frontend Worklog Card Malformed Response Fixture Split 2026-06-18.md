---
title: Frontend Worklog Card Malformed Response Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - worklog
  - enterprise-readiness
status: done
---

# Frontend Worklog Card Malformed Response Fixture Split 2026-06-18

## Context

The post-API-fetch-timeout contract size re-scan showed `agentfeed-frontend/src/lib/worklog-card-malformed-response-guards.contract.test.ts` as the largest remaining contract test at 58 pure LOC. The shared `worklog-card-response-fixtures.ts` was already 112 pure LOC, so this work created a focused malformed-response fixture module instead of growing the shared response fixture.

## Changed

- Split malformed worklog card response cases, JSON response helper, feed-list fail-closed assertion, and fetch restore runner into `src/lib/worklog-card-malformed-response-fixtures.ts`.
- Reduced `src/lib/worklog-card-malformed-response-guards.contract.test.ts` to invoking `assertWorklogCardMalformedResponseContracts()` with the existing contract-test async failure handler.
- Preserved existing worklog card malformed response guard behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/worklog-card-malformed-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/worklog-card-malformed-response-fixtures.ts`: 63 lines / 58 pure LOC
  - `src/lib/worklog-card-response-fixtures.ts`: unchanged at 119 lines / 112 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `0357a74` — `Split worklog card malformed response fixtures`

## Follow-up

- Keep worklog card malformed response cases in `worklog-card-malformed-response-fixtures.ts`.
- Keep checking `worklog-card-response-fixtures.ts` before adding cases; current size is 112 pure LOC.
- [x] `worklog-review-action-response-guards.contract.test.ts` handled in [[Frontend Worklog Review Action Response Fixture Split 2026-06-18]]. Remaining next re-scan candidates: `dashboard-strict-fields.contract.test.ts` and `user-account-response-guards.contract.test.ts` at 55 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

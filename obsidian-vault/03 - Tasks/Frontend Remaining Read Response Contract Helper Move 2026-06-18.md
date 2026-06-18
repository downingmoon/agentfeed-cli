---
title: Frontend Remaining Read Response Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - read-response
  - enterprise-readiness
status: done
---

# Frontend Remaining Read Response Contract Helper Move 2026-06-18

## Context

The post-explore-response-guard contract size re-scan showed `agentfeed-frontend/src/lib/remaining-read-response-guards.contract.test.ts` as the largest remaining contract test at 60 pure LOC. The existing `remaining-read-response-fixtures.ts` was 61 pure LOC and already owned the valid moderation/dashboard/notification/activity/discovery payload fixtures.

## Changed

- Moved valid remaining-read JSON response helper, path-based valid response dispatcher, moderation/dashboard/recent-worklog/notification/activity/suggestion/tag preservation assertions, and fetch restore runner into existing `src/lib/remaining-read-response-fixtures.ts`.
- Reduced `src/lib/remaining-read-response-guards.contract.test.ts` to invoking `assertRemainingReadResponseContracts()` with the existing contract-test async failure handler.
- Preserved existing remaining-read response guard behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because no new standalone contract source was added.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/remaining-read-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/remaining-read-response-fixtures.ts`: 119 lines / 108 pure LOC
  - `src/lib/remaining-read-malformed-response-fixtures.ts`: unchanged at 73 lines / 68 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `6eb34d7` — `Move remaining read response contract helpers`

## Follow-up

- Keep remaining-read valid response helpers in `remaining-read-response-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `remaining-read-response-fixtures.ts`; current size is 108 pure LOC.
- [x] `settings-profile-validation.contract.test.ts` handled in [[Frontend Settings Profile Validation Fixture Split 2026-06-18]]. Remaining next re-scan candidates: `worklog-mutation-body-contracts.contract.test.ts` and `api-fetch-timeout-cancellation.contract.test.ts` at 59 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

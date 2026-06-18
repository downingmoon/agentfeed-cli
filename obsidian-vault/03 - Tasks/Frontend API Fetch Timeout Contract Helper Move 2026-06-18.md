---
title: Frontend API Fetch Timeout Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api-fetch
  - enterprise-readiness
status: done
---

# Frontend API Fetch Timeout Contract Helper Move 2026-06-18

## Context

The post-worklog-mutation-body contract size re-scan showed `agentfeed-frontend/src/lib/api-fetch-timeout-cancellation.contract.test.ts` as the largest remaining contract test at 59 pure LOC. The existing `api-fetch-timeout-cancellation-fixtures.ts` was 24 pure LOC and already owned timeout/cancellation helpers.

## Changed

- Moved timeout-to-504 assertion, shared timeout constant assertion, caller AbortSignal propagation assertion, following-feed cancellation/safe-param assertion, and fetch/timer restore runner into existing `src/lib/api-fetch-timeout-cancellation-fixtures.ts`.
- Reduced `src/lib/api-fetch-timeout-cancellation.contract.test.ts` to invoking `assertApiFetchTimeoutCancellationContracts()` with the existing contract-test async failure handler.
- Preserved existing API fetch timeout/cancellation contract behavior without runtime app changes.
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
  - `src/lib/api-fetch-timeout-cancellation.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/api-fetch-timeout-cancellation-fixtures.ts`: 98 lines / 87 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `da1d624` — `Move API fetch timeout contract helpers`

## Follow-up

- Keep API fetch timeout/cancellation helpers in `api-fetch-timeout-cancellation-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `api-fetch-timeout-cancellation-fixtures.ts`; current size is 87 pure LOC.
- [x] `worklog-card-malformed-response-guards.contract.test.ts` handled in [[Frontend Worklog Card Malformed Response Fixture Split 2026-06-18]]. `worklog-review-action-response-guards.contract.test.ts` handled in [[Frontend Worklog Review Action Response Fixture Split 2026-06-18]], `dashboard-strict-fields.contract.test.ts` handled in [[Frontend Dashboard Strict Field Fixture Split 2026-06-18]], and `user-account-response-guards.contract.test.ts` handled in [[Frontend User Account Response Guard Assertion Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

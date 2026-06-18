---
title: Frontend API Request Contract Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api
  - enterprise-readiness
status: done
---

# Frontend API Request Contract Assertion Move 2026-06-18

## Context

The post-worklog-review-URL-scope re-scan showed `agentfeed-frontend/src/lib/api-request-contracts.contract.test.ts` as the largest remaining contract test at 54 pure LOC. The fixture module already owned endpoint response fixtures and the expected API request matrix; the runner still owned request recording and exact URL/method/query assertion flow.

## Changed

- Moved request recording, expected request lookup, API client exercise calls, and exact method/path/query assertions into `src/lib/api-request-contract-fixtures.ts`.
- Reduced `src/lib/api-request-contracts.contract.test.ts` to invoking `assertApiUrlMethodContracts()` with its async failure handler.
- Preserved existing API request contract behavior without runtime app changes.
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
  - `src/lib/api-request-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/api-request-contract-fixtures.ts`: 159 lines / 149 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `8857388` — `Move API request contract assertions`

## Follow-up

- Keep API request response fixtures, expected request matrix, and assertion harness in `api-request-contract-fixtures.ts`.
- [x] Remaining next re-scan candidate `public-user-leaderboard-contracts.contract.test.ts` handled in [[Frontend Public User Leaderboard Assertion Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

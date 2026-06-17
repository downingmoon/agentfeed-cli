---
title: Frontend API Request Contract Expectation Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-request
  - enterprise-readiness
status: done
---

# Frontend API Request Contract Expectation Move 2026-06-17

## Context

After the API response envelope case move, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-request-contracts.contract.test.ts` as the largest frontend contract file at 86 pure LOC. It already used `api-request-contract-fixtures.ts` for response stubs, but expected method/path/query assertions were still repeated inline.

## Changed

- Moved expected API request method/path/query contracts into `src/lib/api-request-contract-fixtures.ts`.
- Kept `src/lib/api-request-contracts.contract.test.ts` focused on exercising API client calls, recording requests, and table-driven assertion flow.
- Preserved existing API URL/method/query contract behavior without runtime app changes.
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
  - `src/lib/api-request-contracts.contract.test.ts`: 63 lines / 54 pure LOC
  - `src/lib/api-request-contract-fixtures.ts`: 106 lines / 103 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4b84346` — `Move API request contract expectations`

## Follow-up

- Keep API request method/path/query expectations in `api-request-contract-fixtures.ts`.
- [x] Next re-scan found `api-fetch-timeout-cancellation.contract.test.ts` as the largest contract file and split fixtures in [[Frontend API Fetch Timeout Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

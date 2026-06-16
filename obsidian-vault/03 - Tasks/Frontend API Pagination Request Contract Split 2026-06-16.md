---
title: Frontend API Pagination Request Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - api-client
  - pagination
  - enterprise-readiness
status: done
---

# Frontend API Pagination Request Contract Split 2026-06-16

## Context

After the settings profile validation save split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-request-contracts.contract.test.ts` at 168 pure LOC. It mixed endpoint URL/method checks for search/project/me/leaderboard/notifications with cursor pagination request checks for feed, comments, profile, project, and explore endpoints.

## Changed

- Added `src/lib/api-pagination-request-contracts.contract.test.ts` for public/profile/project/explore cursor pagination request contracts.
- Kept `src/lib/api-request-contracts.contract.test.ts` focused on mixed endpoint URL/method/query contracts for project list/detail, search, leaderboard, me lists, and notification read actions.
- Registered the pagination request contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - project/search/leaderboard/me/notification clients keep expected backend paths, methods, and query params.
  - feed, worklog comments, user worklogs/projects, project worklogs, and explore category worklogs pass encoded identifiers plus backend cursor pagination params.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-request-contracts.contract.test.ts`: 152 lines / 132 pure LOC
  - `src/lib/api-pagination-request-contracts.contract.test.ts`: 56 lines / 46 pure LOC
  - `scripts/run-contract-tests.mjs`: 176 lines / 167 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `125b1c7` — `Split API pagination request contracts`

## Follow-up

- Keep mixed endpoint URL/method contracts separate from cursor pagination request contracts when adding future API client request coverage.
- [x] Next re-scan found `api-fetch-request-hardening.contract.test.ts` near 200 pure LOC and split it in [[Frontend API Fetch Timeout Contract Split 2026-06-16]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

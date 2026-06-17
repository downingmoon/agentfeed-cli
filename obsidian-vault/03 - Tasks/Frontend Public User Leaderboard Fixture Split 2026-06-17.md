---
title: Frontend Public User Leaderboard Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - leaderboard
  - enterprise-readiness
status: done
---

# Frontend Public User Leaderboard Fixture Split 2026-06-17

## Context

After the user account response guard fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/public-user-leaderboard-contracts.contract.test.ts` as the largest frontend contract file at 118 pure LOC. It mixed public user payloads and leaderboard malformed row cases with normalizer/adapter assertion flow.

## Changed

- Added `src/lib/public-user-leaderboard-contract-fixtures.ts` for public user payload variants, valid leaderboard rows, and malformed leaderboard row cases.
- Kept `src/lib/public-user-leaderboard-contracts.contract.test.ts` focused on public user normalization, fail-closed malformed public user stats, and leaderboard adapter assertions.
- Preserved existing public user/leaderboard contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture helper, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/public-user-leaderboard-contracts.contract.test.ts`: 60 lines / 53 pure LOC
  - `src/lib/public-user-leaderboard-contract-fixtures.ts`: 119 lines / 112 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `3ed1dff` — `Split public user leaderboard contract fixtures`

## Follow-up

- Keep public user/leaderboard fixtures separate from normalizer and adapter assertion flow when adding future leaderboard coverage.
- [x] Next re-scan found `worklog-card-adapter.contract.test.ts` tied as the largest contract file and moved fixtures in [[Frontend Worklog Card Adapter Fixture Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

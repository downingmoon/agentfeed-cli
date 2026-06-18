---
title: Frontend Public User Leaderboard Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - leaderboard
  - enterprise-readiness
status: done
---

# Frontend Public User Leaderboard Assertion Move 2026-06-18

## Context

The post-API-request assertion move re-scan showed `agentfeed-frontend/src/lib/public-user-leaderboard-contracts.contract.test.ts` as the largest remaining contract test at 53 pure LOC. The fixture module already owned public user payload variants, valid leaderboard rows, and malformed leaderboard row cases; the runner still owned normalizer/adapter assertion flow.

## Changed

- Moved public user extra-field fail-closed assertion, leaderboard row preservation/fail-closed assertions, public stats assertions, and malformed public stats assertion into `src/lib/public-user-leaderboard-contract-fixtures.ts`.
- Reduced `src/lib/public-user-leaderboard-contracts.contract.test.ts` to invoking `assertPublicUserLeaderboardContracts()`.
- Preserved existing public user/leaderboard contract behavior without runtime app changes.
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
  - `src/lib/public-user-leaderboard-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/public-user-leaderboard-contract-fixtures.ts`: 194 lines / 178 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `8184478` — `Move public user leaderboard assertions`

## Follow-up

- Keep public user/leaderboard fixtures, malformed cases, and assertion harness in `public-user-leaderboard-contract-fixtures.ts`.
- Remaining next re-scan candidate: `worklog-detail-malformed-response-guards.contract.test.ts` at 51 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

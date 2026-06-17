---
title: Frontend User Account Response Guard Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - account
  - enterprise-readiness
status: done
---

# Frontend User Account Response Guard Fixture Split 2026-06-17

## Context

After the me client mutation fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/user-account-response-guards.contract.test.ts` tied as the largest frontend contract file at 118 pure LOC. It mixed public user payloads, malformed username/profile cases, and JSON response helper with guard assertion flow.

## Changed

- Added `src/lib/user-account-response-guard-fixtures.ts` for the valid public user payload, malformed user/account cases, and JSON response helper.
- Kept `src/lib/user-account-response-guards.contract.test.ts` focused on valid user/account normalization and fail-closed malformed response assertions.
- Preserved existing user/account response guard behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/user-account-response-guards.contract.test.ts`: 60 lines / 55 pure LOC
  - `src/lib/user-account-response-guard-fixtures.ts`: 62 lines / 59 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `2777662` — `Split user account response guard fixtures`

## Follow-up

- Keep user/account response fixtures and malformed cases separate from guard assertion flow when adding future account response coverage.
- [x] Next re-scan found `public-user-leaderboard-contracts.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Public User Leaderboard Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

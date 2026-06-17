---
title: Frontend API Fetch Request Hardening Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-fetch
  - enterprise-readiness
status: done
---

# Frontend API Fetch Request Hardening Fixture Split 2026-06-17

## Context

After the leaderboard response fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-fetch-request-hardening.contract.test.ts` as the largest frontend contract file at 94 pure LOC. It owned API response stubs in the assertion file while testing request header behavior.

## Changed

- Added `src/lib/api-fetch-request-hardening-fixtures.ts` for auth, social like/unlike, and publish response stubs.
- Kept `src/lib/api-fetch-request-hardening.contract.test.ts` focused on GET/POST/DELETE header and CSRF intent assertions.
- Preserved existing API fetch request header hardening contract behavior without runtime app changes.
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
  - `src/lib/api-fetch-request-hardening.contract.test.ts`: 90 lines / 84 pure LOC
  - `src/lib/api-fetch-request-hardening-fixtures.ts`: 33 lines / 30 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `0387490` — `Split API fetch request hardening fixtures`

## Follow-up

- Keep API fetch request hardening response stubs in `api-fetch-request-hardening-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

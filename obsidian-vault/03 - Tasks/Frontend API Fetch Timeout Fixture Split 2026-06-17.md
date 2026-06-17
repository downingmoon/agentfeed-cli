---
title: Frontend API Fetch Timeout Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-fetch
  - enterprise-readiness
status: done
---

# Frontend API Fetch Timeout Fixture Split 2026-06-17

## Context

After the API request contract expectation move, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-fetch-timeout-cancellation.contract.test.ts` as the largest frontend contract file at 85 pure LOC. It repeated timeout and aborting-fetch helper setup inline.

## Changed

- Added `src/lib/api-fetch-timeout-cancellation-fixtures.ts` for timeout replacement, clear-timeout replacement, rejecting abort fetch helper, and expected following-feed path.
- Kept `src/lib/api-fetch-timeout-cancellation.contract.test.ts` focused on timeout, caller cancellation, and following-feed URL assertions.
- Preserved existing API timeout/caller cancellation/following feed request behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-fetch-timeout-cancellation.contract.test.ts`: 63 lines / 59 pure LOC
  - `src/lib/api-fetch-timeout-cancellation-fixtures.ts`: 28 lines / 24 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d91b7bb` — `Split API fetch timeout fixtures`

## Follow-up

- Keep API timeout/cancellation helper fixtures in `api-fetch-timeout-cancellation-fixtures.ts`.
- [x] Next re-scan found `cli-auth.contract.ts` tied as the largest contract file and split fixtures in [[Frontend CLI Auth Contract Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

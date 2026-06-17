---
title: Frontend API Fetch Request Header Case Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-fetch
  - enterprise-readiness
status: done
---

# Frontend API Fetch Request Header Case Move 2026-06-17

## Context

After the CLI auth contract fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-fetch-request-hardening.contract.test.ts` as the largest frontend contract file at 84 pure LOC. It already used response fixtures, but header expectation scenarios were still repeated inline.

## Changed

- Moved API fetch request header scenarios into `src/lib/api-fetch-request-hardening-fixtures.ts`.
- Kept `src/lib/api-fetch-request-hardening.contract.test.ts` focused on API action dispatch, fetch interception, and table-driven header assertions.
- Preserved existing GET/POST/DELETE Content-Type and CSRF intent contract behavior without runtime app changes.
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
  - `src/lib/api-fetch-request-hardening.contract.test.ts`: 46 lines / 42 pure LOC
  - `src/lib/api-fetch-request-hardening-fixtures.ts`: 64 lines / 60 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `9f6f27a` — `Move API fetch request header cases`

## Follow-up

- Keep API fetch request header scenarios in `api-fetch-request-hardening-fixtures.ts`.
- [x] Next re-scan found `project-mutation-contracts.contract.test.ts` tied as the largest contract file and moved expectations in [[Frontend Project Mutation Request Expectation Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

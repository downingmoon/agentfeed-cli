---
title: Frontend Ingestion Token Response Guard Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - ingestion-token
  - enterprise-readiness
status: done
---

# Frontend Ingestion Token Response Guard Fixture Split 2026-06-17

## Context

After the project stats strict field fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/ingestion-token-response-guards.contract.test.ts` as the largest frontend contract file at 77 pure LOC. Malformed ingestion token response cases and JSON response construction were still inline in the contract test.

## Changed

- Added `src/lib/ingestion-token-response-guard-fixtures.ts` for malformed list/create/rotate ingestion token response cases and JSON response helper.
- Kept `src/lib/ingestion-token-response-guards.contract.test.ts` focused on installing mocked responses, invoking ingestion token client actions, and verifying fail-closed contract diagnostics.
- Preserved existing ingestion token response guard contract behavior without runtime app changes.
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
  - `src/lib/ingestion-token-response-guards.contract.test.ts`: 27 lines / 25 pure LOC
  - `src/lib/ingestion-token-response-guard-fixtures.ts`: 56 lines / 54 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d75c70c` — `Split ingestion token response guard fixtures`

## Follow-up

- Keep ingestion token response guard malformed cases in `ingestion-token-response-guard-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

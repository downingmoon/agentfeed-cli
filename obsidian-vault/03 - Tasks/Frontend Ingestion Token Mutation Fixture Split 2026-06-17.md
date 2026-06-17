---
title: Frontend Ingestion Token Mutation Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - ingestion-token
  - enterprise-readiness
status: done
---

# Frontend Ingestion Token Mutation Fixture Split 2026-06-17

## Context

After the project malformed response fixture move, the next contract size re-scan showed `agentfeed-frontend/src/lib/ingestion-token-mutation-contracts.contract.test.ts` tied as the largest frontend contract file at 101 pure LOC. It owned ingestion token mutation response fixtures, request capture shape, and expected backend route/body cases in the assertion file.

## Changed

- Added `src/lib/ingestion-token-mutation-contract-fixtures.ts` for create/rotate response fixtures, request record type, response selection helper, and expected request route/body contracts.
- Kept `src/lib/ingestion-token-mutation-contracts.contract.test.ts` focused on fetch wiring, API client calls, and exact request assertion flow.
- Preserved existing ingestion token mutation route/body/response contract behavior without runtime app changes.
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
  - `src/lib/ingestion-token-mutation-contracts.contract.test.ts`: 70 lines / 60 pure LOC
  - `src/lib/ingestion-token-mutation-contract-fixtures.ts`: 54 lines / 50 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `dc31cd2` — `Split ingestion token mutation fixtures`

## Follow-up

- Keep ingestion token mutation response and request contract fixtures in `ingestion-token-mutation-contract-fixtures.ts`.
- [x] Next re-scan found `worklog-mutation-body-contracts.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Worklog Mutation Body Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

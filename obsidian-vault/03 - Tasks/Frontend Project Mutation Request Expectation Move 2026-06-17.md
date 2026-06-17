---
title: Frontend Project Mutation Request Expectation Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Mutation Request Expectation Move 2026-06-17

## Context

After the API fetch request header case move, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-mutation-contracts.contract.test.ts` tied as the largest frontend contract file at 83 pure LOC. It already used `project-mutation-contract-fixtures.ts`, but expected mutation request method/path/body assertions were still repeated inline.

## Changed

- Moved expected project mutation request contracts into `src/lib/project-mutation-contract-fixtures.ts`.
- Kept `src/lib/project-mutation-contracts.contract.test.ts` focused on API surface checks, client calls, request capture, and table-driven assertion flow.
- Preserved existing project create/update/delete request contract behavior without runtime app changes.
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
  - `src/lib/project-mutation-contracts.contract.test.ts`: 71 lines / 61 pure LOC
  - `src/lib/project-mutation-contract-fixtures.ts`: 74 lines / 67 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `8c04e63` — `Move project mutation request expectations`

## Follow-up

- Keep project mutation request expectations in `project-mutation-contract-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

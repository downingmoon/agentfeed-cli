---
title: Frontend Project Mutation Contract Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Mutation Contract Fixture Split 2026-06-17

## Context

After the auth next fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-mutation-contracts.contract.test.ts` tied as the largest frontend contract file at 123 pure LOC. It mixed project mutation request bodies, expected JSON bodies, and response helper setup with mutation endpoint assertion flow.

## Changed

- Added `src/lib/project-mutation-contract-fixtures.ts` for project mutation request bodies, expected serialized JSON bodies, request record type, and JSON response helper.
- Kept `src/lib/project-mutation-contracts.contract.test.ts` focused on endpoint exposure, request method/path/body assertions, and mutation response handling.
- Preserved existing project mutation contract behavior without runtime app changes.
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
  - `src/lib/project-mutation-contracts.contract.test.ts`: 96 lines / 83 pure LOC
  - `src/lib/project-mutation-contract-fixtures.ts`: 50 lines / 44 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `9f8d103` — `Split project mutation contract fixtures`

## Follow-up

- Keep project mutation request fixtures separate from endpoint request/response assertion flow when adding future mutation coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

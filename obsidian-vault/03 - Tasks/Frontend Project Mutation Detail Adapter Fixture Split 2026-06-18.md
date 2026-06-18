---
title: Frontend Project Mutation Detail Adapter Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Mutation Detail Adapter Fixture Split 2026-06-18

## Context

The post-URL-navigation contract size re-scan showed `agentfeed-frontend/src/lib/project-mutation-detail-adapters.contract.test.ts` tied for largest remaining contract test at 67 pure LOC.

## Changed

- Split project mutation URL/timestamp/tag/stat preservation checks, malformed mutation cases, detail stat preservation checks, and malformed detail cases into `src/lib/project-mutation-detail-adapter-fixtures.ts`.
- Reduced `src/lib/project-mutation-detail-adapters.contract.test.ts` to invoking `assertProjectMutationDetailAdapterContracts()`.
- Preserved existing project mutation/detail adapter contract behavior without runtime app changes.
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
  - `src/lib/project-mutation-detail-adapters.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/project-mutation-detail-adapter-fixtures.ts`: 91 lines / 81 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `bd21872` — `Split project mutation detail adapter fixtures`

## Follow-up

- Keep project mutation/detail adapter cases in `project-mutation-detail-adapter-fixtures.ts`.
- [x] `identity-profile-contracts.contract.test.ts` handled in [[Frontend Identity Profile Contract Helper Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

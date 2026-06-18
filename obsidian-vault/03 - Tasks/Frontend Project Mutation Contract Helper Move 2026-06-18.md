---
title: Frontend Project Mutation Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Mutation Contract Helper Move 2026-06-18

## Context

The post-API-response-envelope contract size re-scan showed `agentfeed-frontend/src/lib/project-mutation-contracts.contract.test.ts` tied for largest remaining contract test at 61 pure LOC. It already used `project-mutation-contract-fixtures.ts`, but API surface checks, request recording, and mutation assertions were still inline.

## Changed

- Moved project mutation API surface checks, request recorder, exact method/path/body/Content-Type assertions, and create/update/delete response assertions into existing `src/lib/project-mutation-contract-fixtures.ts`.
- Reduced `src/lib/project-mutation-contracts.contract.test.ts` to invoking `assertProjectMutationContracts()` with the existing contract-test async failure handler.
- Preserved existing project mutation contract behavior without runtime app changes.
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
  - `src/lib/project-mutation-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/project-mutation-contract-fixtures.ts`: 141 lines / 125 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `798d072` — `Move project mutation contract helpers`

## Follow-up

- Keep project mutation contract helpers in `project-mutation-contract-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `project-mutation-contract-fixtures.ts`, now 125 pure LOC.
- Remaining next re-scan candidates from previous scan: `settings-profile-validation-save.contract.test.ts`, `integration-status-contracts.contract.test.ts`, and `me-client-mutation-contracts.contract.test.ts` at 61 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

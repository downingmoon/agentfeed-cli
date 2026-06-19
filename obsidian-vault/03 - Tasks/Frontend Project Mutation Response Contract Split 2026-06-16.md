---
title: Frontend Project Mutation Response Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - mutation
  - enterprise-readiness
status: done
---

# Frontend Project Mutation Response Contract Split 2026-06-16

## Context

After the project response split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-mutation-contracts.contract.test.ts` at 175 pure LOC. It mixed mutation endpoint/body request contracts, shared mutation response payload, and strict mutation response fail-closed behavior in one file.

## Changed

- Added `src/lib/project-mutation-response-fixtures.ts` for the shared valid project mutation response payload.
- Moved strict mutation response fail-closed behavior into `src/lib/project-mutation-response-contracts.contract.test.ts`.
- Kept `src/lib/project-mutation-contracts.contract.test.ts` focused on create/update/delete endpoint, method, encoded ID, Content-Type, request body, and successful response shape preservation.
- Registered the mutation response contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - `projects.create`, `projects.update`, and `projects.delete` stay exposed.
  - create/update/delete use the expected backend paths, methods, content type behavior, and JSON body shape.
  - create/update return backend project payloads and delete returns OkResponse data.
  - unexpected backend project mutation response fields fail closed with the project mutation response diagnostic.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/project-mutation-contracts.contract.test.ts`: 139 lines / 123 pure LOC
  - `src/lib/project-mutation-response-contracts.contract.test.ts`: 32 lines / 29 pure LOC
  - `src/lib/project-mutation-response-fixtures.ts`: 35 lines / 35 pure LOC
  - `scripts/run-contract-tests.mjs`: 172 lines / 163 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4cc6790` — `Split project mutation response contract`

## Follow-up

- [x] 2026-06-19 follow-up: `project-mutation-response-contracts.contract.test.ts` runner slimming handled in [[Frontend Project Mutation Response Assertion Move 2026-06-19]]; fixtures remain in `project-mutation-response-fixtures.ts` and assertions now live in `project-mutation-response-assertions.ts`.

- Keep project mutation request/body contracts, response fixtures, and strict response fail-closed checks separated when adding future mutation coverage.
- [x] Next re-scan found `project-schema-variants-strict-fields.contract.test.ts` near 200 pure LOC and split it in [[Frontend Project Schema Variant Contract Split 2026-06-16]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

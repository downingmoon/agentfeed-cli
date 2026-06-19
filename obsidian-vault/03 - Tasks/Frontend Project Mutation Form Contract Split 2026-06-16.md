---
title: Frontend Project Mutation Form Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - projects
  - mutation
  - enterprise-readiness
status: done
---

# Frontend Project Mutation Form Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/project-mutation-contracts.contract.test.ts` was a documented warning-band file that mixed project mutation form serializer semantics with API route/body/response contracts. The central enterprise polish log called out a split by form serializer, request body, and strict response guard before adding new cases.

## Changed

- Moved existing project mutation form serializer checks into `src/lib/project-mutation-form-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Kept `src/lib/project-mutation-contracts.contract.test.ts` focused on project mutation API surface availability, create/update/delete method/path/body/content-type behavior, returned project/delete payloads, and strict mutation response fail-closed behavior.
- Preserved these existing guarantees:
  - create forms omit blank optional fields instead of sending null clear semantics.
  - edit forms send explicit `null` for cleared nullable fields and `[]` for cleared tags.
  - `UpdateProjectBody` keeps nullable URL/description fields type-compatible with clear semantics.
  - create/update/delete project API route/body contracts remain unchanged.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/project-mutation-contracts.contract.test.ts`: 192 lines / 175 pure LOC
  - `src/lib/project-mutation-form-contracts.contract.test.ts`: 40 lines / 36 pure LOC
  - `scripts/run-contract-tests.mjs`: 164 lines / 155 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4a2d062` — `Split project mutation form contracts`

## Follow-up

- Keep project form serializer contracts separate from project mutation route/body/response contracts when adding future project cases.
- [x] `search-explore-response-guards.contract.test.ts` warning-band split was handled in [[Frontend Search Explore Response Guard Split 2026-06-16]].
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

> [!success] 2026-06-19 follow-up
> The remaining project mutation form serializer/null-clear assertion orchestration in `project-mutation-form-contracts.contract.test.ts` was moved to `project-mutation-form-assertions.ts` in [[Frontend Project Mutation Form Assertion Move 2026-06-19]]. The runner is now 2 pure LOC.

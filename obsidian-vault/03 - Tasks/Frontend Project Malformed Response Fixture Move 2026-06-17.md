---
title: Frontend Project Malformed Response Fixture Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Malformed Response Fixture Move 2026-06-17

## Context

After the privacy scan strict field fixture move, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-malformed-response-contracts.contract.test.ts` as the largest frontend contract file at 102 pure LOC. It owned malformed project list/detail response cases while `project-response-fixtures.ts` already owned project response summary/detail fixtures.

## Changed

- Moved malformed project response cases into `src/lib/project-response-fixtures.ts`.
- Kept project API action dispatch in `src/lib/project-malformed-response-contracts.contract.test.ts` so the fixture module stays data-oriented.
- Kept `project-malformed-response-contracts.contract.test.ts` focused on mocked response wiring and fail-closed assertions.
- Preserved existing project malformed response contract behavior without runtime app changes.
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
  - `src/lib/project-malformed-response-contracts.contract.test.ts`: 49 lines / 44 pure LOC
  - `src/lib/project-response-fixtures.ts`: 108 lines / 105 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `249c948` — `Move project malformed response fixtures`

## Follow-up

- Keep project malformed response cases in `project-response-fixtures.ts` with project response summary/detail fixtures.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

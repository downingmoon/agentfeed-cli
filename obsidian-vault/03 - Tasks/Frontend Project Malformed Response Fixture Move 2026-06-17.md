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
- 2026-06-18 [[Frontend Project Malformed Response Assertion Move 2026-06-18]] moved the runner-owned assertion flow into `src/lib/project-malformed-response-assertions.ts` without growing `project-response-fixtures.ts`.
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
  - `src/lib/project-malformed-response-contracts.contract.test.ts`: originally 49 lines / 44 pure LOC; 2026-06-18 split result is 6 lines / 5 pure LOC runner plus 51 lines / 45 pure LOC assertion helper
  - `src/lib/project-response-fixtures.ts`: 108 lines / 105 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `249c948` — `Move project malformed response fixtures`

## Follow-up

- [x] Project malformed response assertion flow moved in [[Frontend Project Malformed Response Assertion Move 2026-06-18]].
- Keep project malformed response cases in `project-response-fixtures.ts` with project response summary/detail fixtures.
- [x] Next re-scan found `ingestion-token-mutation-contracts.contract.test.ts` tied as the largest contract file and split fixtures in [[Frontend Ingestion Token Mutation Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

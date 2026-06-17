---
title: Frontend Account Project Mutation Response Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - account
  - project
  - enterprise-readiness
status: done
---

# Frontend Account Project Mutation Response Fixture Split 2026-06-17

## Context

After the owner project detail fixture move, the next contract size re-scan showed `agentfeed-frontend/src/lib/account-project-mutation-response-guards.contract.test.ts` as the largest frontend contract file at 90 pure LOC. It owned mixed project, profile, username, and settings malformed response data directly in the assertion file.

## Changed

- Added `src/lib/account-project-mutation-response-fixtures.ts` for valid project/profile/settings fixtures and malformed account/project mutation response cases.
- Kept `src/lib/account-project-mutation-response-guards.contract.test.ts` focused on response wrapping, API action dispatch, and fail-closed assertion flow.
- Preserved existing account/project mutation response guard behavior without runtime app changes.
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
  - `src/lib/account-project-mutation-response-guards.contract.test.ts`: 45 lines / 41 pure LOC
  - `src/lib/account-project-mutation-response-fixtures.ts`: 63 lines / 60 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `33ee89b` — `Split account project mutation response fixtures`

## Follow-up

- Keep account/project mutation response guard fixtures in `account-project-mutation-response-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

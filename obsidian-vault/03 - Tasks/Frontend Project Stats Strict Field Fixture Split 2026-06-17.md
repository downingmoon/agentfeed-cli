---
title: Frontend Project Stats Strict Field Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Stats Strict Field Fixture Split 2026-06-17

## Context

After the worklog detail adapter fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-stats-strict-fields.contract.test.ts` as the largest frontend contract file at 78 pure LOC. Valid project stats response setup, malformed legacy alias cases, and API response construction were still inline in the contract test.

## Changed

- Added `src/lib/project-stats-strict-fields-fixtures.ts` for the valid project stats payload, malformed legacy stats alias cases, and API response helper.
- Kept `src/lib/project-stats-strict-fields.contract.test.ts` focused on invoking `projects.get`, checking exact backend `ProjectStats` fields, and verifying legacy alias fields fail closed.
- Preserved existing project stats strict-field contract behavior without runtime app changes.
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
  - `src/lib/project-stats-strict-fields.contract.test.ts`: 37 lines / 33 pure LOC
  - `src/lib/project-stats-strict-fields-fixtures.ts`: 48 lines / 46 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `74c21c7` — `Split project stats strict field fixtures`

## Follow-up

- Keep project stats strict-field fixtures and legacy alias cases in `project-stats-strict-fields-fixtures.ts`.
- Re-scan found `ingestion-token-response-guards.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Ingestion Token Response Guard Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

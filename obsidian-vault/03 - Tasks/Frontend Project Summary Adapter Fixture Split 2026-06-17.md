---
title: Frontend Project Summary Adapter Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Summary Adapter Fixture Split 2026-06-17

## Context

After the CLI auth malformed response fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/project-summary-adapters.contract.test.ts` as the largest frontend contract file at 128 pure LOC. It mixed project summary variant fixtures and malformed row cases with adapter assertion flow.

## Changed

- Added `src/lib/project-summary-adapter-fixtures.ts` for project summary owner/stat variants, malformed row cases, and public visibility rows.
- Kept `src/lib/project-summary-adapters.contract.test.ts` focused on adapter behavior assertions for stats, owners, tags, links, malformed rows, and public filtering.
- Preserved existing project summary adapter contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture helper, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/project-summary-adapters.contract.test.ts`: 89 lines / 71 pure LOC
  - `src/lib/project-summary-adapter-fixtures.ts`: 67 lines / 60 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `5817d73` — `Split project summary adapter fixtures`

## Follow-up

- Keep project summary adapter fixtures and malformed row cases separate from adapter assertion flow when adding future project list coverage.
- [x] Next re-scan found `worklog-review-action-contracts.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Worklog Review Action Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

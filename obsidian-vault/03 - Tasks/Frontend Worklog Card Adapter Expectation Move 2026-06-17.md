---
title: Frontend Worklog Card Adapter Expectation Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - worklog
  - enterprise-readiness
status: done
---

# Frontend Worklog Card Adapter Expectation Move 2026-06-17

## Context

After the worklog review action case move, the next contract size re-scan showed `agentfeed-frontend/src/lib/worklog-card-adapter.contract.test.ts` tied as the largest frontend contract file at 75 pure LOC. It already used `worklog-card-contract-fixtures.ts`, but collection source, multi-agent metrics, hidden metrics, and viewer-state/social expectation details were still inline.

## Changed

- Moved worklog card adapter expectation helpers into existing `src/lib/worklog-card-contract-fixtures.ts`.
- Added a viewer-state-without-can-comment fixture to the same module.
- Kept `src/lib/worklog-card-adapter.contract.test.ts` focused on invoking `adaptWorklogCard`, checking absent source, default `canComment`, raw agent normalization, and nullable array normalization.
- Preserved existing worklog card adapter contract behavior without runtime app changes.
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
  - `src/lib/worklog-card-adapter.contract.test.ts`: 49 lines / 37 pure LOC
  - `src/lib/worklog-card-contract-fixtures.ts`: 202 lines / 187 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `1183b51` — `Move worklog card adapter expectations`

## Follow-up

- Re-scan found `public-user-strict-stats.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Public User Strict Stats Fixture Split 2026-06-18]].
- Keep worklog card adapter expectation helpers in `worklog-card-contract-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `worklog-card-contract-fixtures.ts`, now 187 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

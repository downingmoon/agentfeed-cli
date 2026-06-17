---
title: Frontend Owner Project Detail Fixture Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Owner Project Detail Fixture Move 2026-06-17

## Context

After the API response hardening scenario move, the next contract size re-scan showed `agentfeed-frontend/src/lib/owner-project-detail-contracts.contract.test.ts` as the largest frontend contract file at 92 pure LOC. It already used `owner-project-detail-fixtures.ts`, but still owned full and partial owner-project wrapper data inline.

## Changed

- Moved complete owner-project detail stats and wrapper payload into `src/lib/owner-project-detail-fixtures.ts`.
- Moved partial owner-project detail wrapper payload into `src/lib/owner-project-detail-fixtures.ts`.
- Kept `src/lib/owner-project-detail-contracts.contract.test.ts` focused on surface contract, request URL, and normalized stats assertions.
- Preserved existing owner-aware project detail contract behavior without runtime app changes.
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
  - `src/lib/owner-project-detail-contracts.contract.test.ts`: 81 lines / 73 pure LOC
  - `src/lib/owner-project-detail-fixtures.ts`: 72 lines / 68 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `26da52f` — `Move owner project detail fixtures`

## Follow-up

- Keep owner-project detail wrapper and stats fixtures in `owner-project-detail-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

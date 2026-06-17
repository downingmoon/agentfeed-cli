---
title: Frontend Contract Runner Source Registry Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - runner
  - enterprise-readiness
status: done
---

# Frontend Contract Runner Source Registry Split 2026-06-17

## Context

Repeated frontend contract split notes left a follow-up that `agentfeed-frontend/scripts/run-contract-tests.mjs` kept growing as new focused contract files were registered. After the API fetch timeout split, the runner reached 168 pure LOC and mixed runner orchestration with compile-only, compiled contract, and direct-node target registries.

## Changed

- Added `scripts/contract-test-sources.mjs` for `compileOnlySources`, `contractSources`, and `directNodeTargets`.
- Reduced `scripts/run-contract-tests.mjs` to runner orchestration only: cleanup, TypeScript compile, compiled contract execution, direct-node contract execution, and exit-code handling.
- Preserved existing contract source order and direct node target order.
- No runtime app behavior changed.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `scripts/run-contract-tests.mjs`: 46 lines / 40 pure LOC
  - `scripts/contract-test-sources.mjs`: 131 lines / 129 pure LOC
- Visual QA: not run because this was a non-UI contract-runner refactor.

## Commits

- Frontend: `653e748` — `Split contract test source registry`

## Follow-up

- Keep `run-contract-tests.mjs` focused on orchestration and put future source registrations in `contract-test-sources.mjs`.
- [x] Next re-scan found `remaining-read-response-guards.contract.test.ts` as the largest contract file and split it in [[Frontend Remaining Read Response Guard Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

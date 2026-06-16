---
title: Frontend Collection Evidence Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - collection-evidence
  - enterprise-readiness
status: done
---

# Frontend Collection Evidence Contract Split 2026-06-16

## Context

After splitting worklog detail guards, `agentfeed-frontend/src/lib/collection-evidence.contract.test.ts` became the largest non-CI frontend contract file near the 200 pure LOC warning band. It mixed a large review fixture, valid collection evidence preservation checks, and malformed evidence fail-closed cases in one file.

## Changed

- Added `src/lib/collection-evidence-fixtures.ts` for the shared review payload with collection evidence.
- Moved malformed evidence fail-closed cases into `src/lib/collection-evidence-malformed.contract.test.ts`.
- Kept `src/lib/collection-evidence.contract.test.ts` focused on valid model, per-agent metric, collection quality, and collection source evidence display.
- Registered the malformed evidence contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - review evidence exposes all collected models for publish decisions.
  - review evidence exposes per-agent metric breakdown for multi-agent sessions.
  - collection quality/source evidence is visible for trust review.
  - malformed models, agent metric rows, collection sources, collection quality, and window reason fail closed with the collection evidence contract diagnostic.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/collection-evidence.contract.test.ts`: 25 lines / 19 pure LOC
  - `src/lib/collection-evidence-malformed.contract.test.ts`: 115 lines / 109 pure LOC
  - `src/lib/collection-evidence-fixtures.ts`: 66 lines / 64 pure LOC
  - `scripts/run-contract-tests.mjs`: 168 lines / 159 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `7742130` — `Split collection evidence contracts`

## Follow-up

- Keep valid collection evidence display checks, malformed fail-closed cases, and shared review fixtures separated when adding future evidence coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

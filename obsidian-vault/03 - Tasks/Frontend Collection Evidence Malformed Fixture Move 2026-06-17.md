---
title: Frontend Collection Evidence Malformed Fixture Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - collection-evidence
  - enterprise-readiness
status: done
---

# Frontend Collection Evidence Malformed Fixture Move 2026-06-17

## Context

After the worklog review strict field fixture move, the next contract size re-scan showed `agentfeed-frontend/src/lib/collection-evidence-malformed.contract.test.ts` as the largest frontend contract file at 109 pure LOC. It still owned malformed collection evidence builders and cases while `collection-evidence-fixtures.ts` already owned the valid collection evidence review fixture.

## Changed

- Moved malformed collection evidence review builders into `src/lib/collection-evidence-fixtures.ts`.
- Exported `malformedEvidenceReviewCases` from `src/lib/collection-evidence-fixtures.ts`.
- Kept `src/lib/collection-evidence-malformed.contract.test.ts` focused on executing malformed case assertions.
- Preserved existing collection evidence malformed fail-closed contract behavior without runtime app changes.
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
  - `src/lib/collection-evidence-malformed.contract.test.ts`: 10 lines / 9 pure LOC
  - `src/lib/collection-evidence-fixtures.ts`: 164 lines / 159 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `22606ce` — `Move collection evidence malformed fixtures`

## Follow-up

- Keep collection evidence malformed review cases in `collection-evidence-fixtures.ts` with the valid collection evidence review fixture.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

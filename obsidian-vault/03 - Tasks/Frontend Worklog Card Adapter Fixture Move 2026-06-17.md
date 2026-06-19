---
title: Frontend Worklog Card Adapter Fixture Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - worklog-card
  - enterprise-readiness
status: done
---

# Frontend Worklog Card Adapter Fixture Move 2026-06-17

## Context

After the public user leaderboard fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/worklog-card-adapter.contract.test.ts` tied as the largest frontend contract file at 116 pure LOC. It still owned several adapter variant payloads even though `worklog-card-contract-fixtures.ts` already existed for shared card fixtures.

## Changed

- Moved multi-agent metrics, hidden file stats, viewer state, raw agent key, and nullable array card variants into `src/lib/worklog-card-contract-fixtures.ts`.
- Kept `src/lib/worklog-card-adapter.contract.test.ts` focused on adapter behavior assertions for collection source, metrics, viewer state/social overrides, agent labels, and nullable arrays.
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
  - `src/lib/worklog-card-adapter.contract.test.ts`: 94 lines / 75 pure LOC
  - `src/lib/worklog-card-contract-fixtures.ts`: 134 lines / 124 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `de934c0` — `Move worklog card adapter fixtures`

## Follow-up

- Keep worklog card adapter variant payloads in `worklog-card-contract-fixtures.ts` and assertion flow in the adapter contract file.
- [x] Next re-scan found `settings-profile-save.contract.test.ts` as the largest contract file and moved fixtures in [[Frontend Settings Profile Save Fixture Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

> [!success] 2026-06-19 follow-up
> The remaining adapter assertion orchestration in `worklog-card-adapter.contract.test.ts` was moved to `worklog-card-adapter-assertions.ts` in [[Frontend Worklog Card Adapter Assertion Move 2026-06-19]]. The runner is now 2 pure LOC; `worklog-card-contract-fixtures.ts` remains the fixture owner.

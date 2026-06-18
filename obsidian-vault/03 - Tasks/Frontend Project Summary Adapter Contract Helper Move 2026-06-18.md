---
title: Frontend Project Summary Adapter Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - project
  - enterprise-readiness
status: done
---

# Frontend Project Summary Adapter Contract Helper Move 2026-06-18

## Context

The post-notification-URL contract size re-scan showed `agentfeed-frontend/src/lib/project-summary-adapters.contract.test.ts` tied as the largest frontend contract file at 71 pure LOC. It already used `project-summary-adapter-fixtures.ts`, but the project summary adapter stats/avatar/privacy/route/malformed/public-visibility assertions were still inline.

## Changed

- Moved project summary adapter assertion helper into existing `src/lib/project-summary-adapter-fixtures.ts`.
- Kept `src/lib/project-summary-adapters.contract.test.ts` focused on invoking the exported project summary adapter contract helper.
- Preserved existing project summary stats, owner avatar, hidden metric null, owner username fallback, slug fallback, malformed row fail-closed, public visibility filtering, and stats:null behavior without runtime app changes.
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
  - `src/lib/project-summary-adapters.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/project-summary-adapter-fixtures.ts`: 156 lines / 131 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `a9a617a` — `Move project summary adapter contract helpers`

## Follow-up

- Keep project summary adapter contract assertions in `project-summary-adapter-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `project-summary-adapter-fixtures.ts`, now 131 pure LOC.
- Next re-scan candidates: `settings-profile-save.contract.test.ts` and `remaining-mutation-response-guards.contract.test.ts` tied at 71 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

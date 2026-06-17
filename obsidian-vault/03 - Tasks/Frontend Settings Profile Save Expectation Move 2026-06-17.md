---
title: Frontend Settings Profile Save Expectation Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - settings
  - enterprise-readiness
status: done
---

# Frontend Settings Profile Save Expectation Move 2026-06-17

## Context

After the comment response guard fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts` tied as the largest frontend contract file at 80 pure LOC. The file already used `settings-profile-save.contract-fixtures.ts`, but detailed scenario expectations for partial saves, profile failures, username network failures, and normalized username saves were still inline.

## Changed

- Moved settings profile save scenario expectations into existing `src/lib/settings-profile-save.contract-fixtures.ts`.
- Kept `src/lib/settings-profile-save.contract.test.ts` focused on arranging save scenarios, invoking `saveSettingsProfile`, and dispatching expectation helpers.
- Preserved existing settings profile save contract behavior without runtime app changes.
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
  - `src/lib/settings-profile-save.contract.test.ts`: 82 lines / 71 pure LOC
  - `src/lib/settings-profile-save.contract-fixtures.ts`: 113 lines / 102 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `9ef24ff` — `Move settings profile save expectations`

## Follow-up

- Keep settings profile save scenario expectations in `settings-profile-save.contract-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

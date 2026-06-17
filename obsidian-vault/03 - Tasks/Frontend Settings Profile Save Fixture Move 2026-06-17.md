---
title: Frontend Settings Profile Save Fixture Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - settings
  - enterprise-readiness
status: done
---

# Frontend Settings Profile Save Fixture Move 2026-06-17

## Context

After the worklog card adapter fixture move, the next contract size re-scan showed `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts` as the largest frontend contract file at 116 pure LOC. It already had `settings-profile-save.contract-fixtures.ts`, but repeated settings profile form bodies still lived in the assertion file.

## Changed

- Moved partial success, profile save failure, username network failure, and successful username change form fixtures into `src/lib/settings-profile-save.contract-fixtures.ts`.
- Kept `src/lib/settings-profile-save.contract.test.ts` focused on partial/saved/failed result assertions and API action behavior.
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
  - `src/lib/settings-profile-save.contract.test.ts`: 91 lines / 80 pure LOC
  - `src/lib/settings-profile-save.contract-fixtures.ts`: 77 lines / 70 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `7972b3c` — `Move settings profile save fixtures`

## Follow-up

- Keep settings profile save form fixtures in `settings-profile-save.contract-fixtures.ts` and assertion flow in the contract file.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

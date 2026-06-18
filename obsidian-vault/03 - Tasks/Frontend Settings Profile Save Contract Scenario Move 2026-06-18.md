---
title: Frontend Settings Profile Save Contract Scenario Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - settings
  - enterprise-readiness
status: done
---

# Frontend Settings Profile Save Contract Scenario Move 2026-06-18

## Context

The post-project-summary contract size re-scan showed `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts` tied as the largest frontend contract file at 71 pure LOC. It already used `settings-profile-save.contract-fixtures.ts`, but the partial profile success, profile save failure, username network failure, and successful username change scenario runners were still inline.

## Changed

- Moved settings profile save scenario runners into existing `src/lib/settings-profile-save.contract-fixtures.ts`.
- Kept `src/lib/settings-profile-save.contract.test.ts` focused on invoking the exported settings profile save contract helper.
- Preserved existing profile/username save ordering, partial success copy, action-level failure copy, connectivity guidance, and normalized username behavior without runtime app changes.
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
  - `src/lib/settings-profile-save.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/settings-profile-save.contract-fixtures.ts`: 176 lines / 156 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `b3fed69` — `Move settings profile save contract scenarios`

## Follow-up

- Keep settings profile save scenario runners in `settings-profile-save.contract-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `settings-profile-save.contract-fixtures.ts`, now 156 pure LOC.
- Next re-scan candidate: `remaining-mutation-response-guards.contract.test.ts` at 71 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

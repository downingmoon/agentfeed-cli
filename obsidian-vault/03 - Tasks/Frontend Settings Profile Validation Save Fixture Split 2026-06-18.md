---
title: Frontend Settings Profile Validation Save Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - settings
  - enterprise-readiness
status: done
---

# Frontend Settings Profile Validation Save Fixture Split 2026-06-18

## Context

The post-project-mutation contract size re-scan showed `agentfeed-frontend/src/lib/settings-profile-validation-save.contract.test.ts` tied for largest remaining contract test at 61 pure LOC. The existing `settings-profile-save.contract-fixtures.ts` was already 156 pure LOC, so this work created a focused validation-save fixture module instead of growing the near-200 LOC shared fixture.

## Changed

- Split missing-username validation and invalid-username-format no-partial-save assertions into `src/lib/settings-profile-validation-save-fixtures.ts`.
- Reduced `src/lib/settings-profile-validation-save.contract.test.ts` to invoking `assertSettingsProfileValidationSaveContracts()` with the existing contract-test async failure handler.
- Preserved existing settings profile validation-save contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/settings-profile-validation-save.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/settings-profile-validation-save-fixtures.ts`: 62 lines / 57 pure LOC
  - `src/lib/settings-profile-save.contract-fixtures.ts`: unchanged at 176 lines / 156 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `2e2de19` — `Split settings profile validation save fixtures`

## Follow-up

- Keep settings validation-save cases in `settings-profile-validation-save-fixtures.ts`.
- Keep checking `settings-profile-save.contract-fixtures.ts` before adding cases; it remains near-200 at 156 pure LOC.
- [x] `integration-status-contracts.contract.test.ts` handled in [[Frontend Integration Status Contract Fixture Split 2026-06-18]]. Remaining next re-scan candidate: `me-client-mutation-contracts.contract.test.ts` at 61 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

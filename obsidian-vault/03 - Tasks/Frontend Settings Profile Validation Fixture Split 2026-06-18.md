---
title: Frontend Settings Profile Validation Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - settings
  - enterprise-readiness
status: done
---

# Frontend Settings Profile Validation Fixture Split 2026-06-18

## Context

The post-remaining-read-response contract size re-scan showed `agentfeed-frontend/src/lib/settings-profile-validation.contract.test.ts` tied for largest remaining contract test at 59 pure LOC. The shared `settings-profile-save.contract-fixtures.ts` was already 156 pure LOC, so this work created a focused settings-profile-validation fixture module instead of growing the near-200 shared save fixture.

## Changed

- Split invalid profile form helper, text-bound validation cases, backend-aligned URL validation cases, no-profile-mutation assertions, and validation runners into `src/lib/settings-profile-validation-fixtures.ts`.
- Reduced `src/lib/settings-profile-validation.contract.test.ts` to invoking `assertSettingsProfileValidationContracts()` with the existing contract-test async failure handler.
- Preserved existing settings profile validation contract behavior without runtime app changes.
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
  - `src/lib/settings-profile-validation.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/settings-profile-validation-fixtures.ts`: 71 lines / 61 pure LOC
  - `src/lib/settings-profile-save.contract-fixtures.ts`: unchanged at 176 lines / 156 pure LOC
  - `src/lib/settings-profile-validation-save-fixtures.ts`: unchanged at 62 lines / 57 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `b283c41` — `Split settings profile validation fixtures`

## Follow-up

- Keep settings profile validation cases in `settings-profile-validation-fixtures.ts`.
- Keep checking `settings-profile-save.contract-fixtures.ts` before adding cases; it remains near-200 at 156 pure LOC.
- Remaining next re-scan candidates: `worklog-mutation-body-contracts.contract.test.ts` and `api-fetch-timeout-cancellation.contract.test.ts` at 59 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

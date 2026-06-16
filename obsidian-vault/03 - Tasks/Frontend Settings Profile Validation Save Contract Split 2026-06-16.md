---
title: Frontend Settings Profile Validation Save Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - settings
  - profile
  - enterprise-readiness
status: done
---

# Frontend Settings Profile Validation Save Contract Split 2026-06-16

## Context

After the me settings mutation split, the next contract size re-scan showed `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts` at 169 pure LOC. It mixed save-flow success/partial/failure behavior with preflight validation/no-API behavior.

## Changed

- Added `src/lib/settings-profile-validation-save.contract.test.ts` for validation/no-API save preflight behavior.
- Kept `src/lib/settings-profile-save.contract.test.ts` focused on profile save success, partial username failure, profile failure, username network failure, and normalized username success flows.
- Registered the validation save contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - profile details save before username change and partial username failure keeps saved profile patch.
  - profile and username action failures keep action-level/user-facing copy.
  - successful username changes store the normalized username.
  - missing/invalid usernames fail validation before any profile or username mutation call.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/settings-profile-save.contract.test.ts`: 127 lines / 116 pure LOC
  - `src/lib/settings-profile-validation-save.contract.test.ts`: 68 lines / 61 pure LOC
  - `scripts/run-contract-tests.mjs`: 175 lines / 166 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `9879ec6` — `Split settings profile validation save contracts`

## Follow-up

- Keep save-flow behavior and validation/no-API preflight behavior separated when adding future settings profile save coverage.
- [x] Next re-scan found `api-request-contracts.contract.test.ts` near 200 pure LOC and split it in [[Frontend API Pagination Request Contract Split 2026-06-16]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

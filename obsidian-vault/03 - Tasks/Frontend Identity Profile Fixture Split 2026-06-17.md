---
title: Frontend Identity Profile Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - identity
  - enterprise-readiness
status: done
---

# Frontend Identity Profile Fixture Split 2026-06-17

## Context

After the API response hardening fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/identity-profile-contracts.contract.test.ts` as the largest frontend contract file at 129 pure LOC. It mixed user/comment identity fixtures with profile link, display, avatar, and comment adapter assertions.

## Changed

- Added `src/lib/identity-profile-contract-fixtures.ts` for user identity fixtures, comment avatar rows, and malformed comment rows.
- Kept `src/lib/identity-profile-contracts.contract.test.ts` focused on adaptUser, profile link, display handle, initials seed, and comment adapter assertions.
- Preserved existing identity/profile contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture helper, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/identity-profile-contracts.contract.test.ts`: 73 lines / 67 pure LOC
  - `src/lib/identity-profile-contract-fixtures.ts`: 75 lines / 69 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `3143b64` — `Split identity profile contract fixtures`

## Follow-up

- Keep identity/profile fixtures separate from profile link, display, avatar, and comment adapter assertions when adding future identity coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

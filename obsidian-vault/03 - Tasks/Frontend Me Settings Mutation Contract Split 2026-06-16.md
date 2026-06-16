---
title: Frontend Me Settings Mutation Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - me-client
  - settings
  - enterprise-readiness
status: done
---

# Frontend Me Settings Mutation Contract Split 2026-06-16

## Context

After the project schema variant split, the next contract size re-scan showed `agentfeed-frontend/src/lib/me-client-mutation-contracts.contract.test.ts` at 170 pure LOC. It mixed ingestion token, profile, username, and settings mutation contracts in one file.

## Changed

- Added `src/lib/me-settings-mutation-contracts.contract.test.ts` for privacy and notification settings mutation contracts.
- Kept `src/lib/me-client-mutation-contracts.contract.test.ts` focused on ingestion token creation, profile update, and username update contracts.
- Registered the settings mutation contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - `me.createIngestionToken` POSTs the expected JSON body and returns the one-time backend token secret.
  - `me.updateProfile` PATCHes editable profile fields and preserves backend PublicUser stats/viewer state.
  - `me.setUsername` POSTs username in the JSON body and returns the normalized backend username.
  - settings PATCH calls keep flat section request bodies while unwrapping full settings responses.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/me-client-mutation-contracts.contract.test.ts`: 129 lines / 123 pure LOC
  - `src/lib/me-settings-mutation-contracts.contract.test.ts`: 74 lines / 70 pure LOC
  - `scripts/run-contract-tests.mjs`: 174 lines / 165 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `7837c3e` — `Split me settings mutation contracts`

## Follow-up

- Keep ingestion/profile/username mutation contracts separate from settings mutation contracts when adding future me-client coverage.
- [x] Next re-scan found `settings-profile-save.contract.test.ts` near 200 pure LOC and split it in [[Frontend Settings Profile Validation Save Contract Split 2026-06-16]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

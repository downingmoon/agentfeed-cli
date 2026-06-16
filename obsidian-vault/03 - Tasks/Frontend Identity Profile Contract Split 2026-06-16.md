---
title: Frontend Identity Profile Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - enterprise-readiness
status: done
---

# Frontend Identity Profile Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed user identity, avatar preservation, public profile link, and comment author identity checks into the broad API omnibus contract file. These checks guard user-facing trust surfaces, but they are not API transport/parser tests and should be reviewable as their own contract domain.

## Changed

- Moved existing identity/profile/avatar/comment-author assertions into `src/lib/identity-profile-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed the now-unused imports and 135 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - `adaptUser` preserves GitHub `avatar_url` and trusted GitHub avatar fallbacks.
  - id-only backend users do not become public profile handles.
  - comment rows fail closed when author identity is malformed.
  - profile href helpers use public usernames and do not fall back to backend IDs.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, or eslint-disable additions; only match was the pre-existing literal text `unknown-user` in a contract fixture.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 998 lines / 842 pure LOC
  - `src/lib/identity-profile-contracts.contract.test.ts`: 135 lines / 129 pure LOC
  - `scripts/run-contract-tests.mjs`: 152 lines / 143 pure LOC

## Follow-up

- Continue splitting the remaining `api-contract.test.ts` clusters: auth next, list merge, review origin, navigation, direct worklog body, and API surface checks.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

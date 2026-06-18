---
title: Frontend Identity Profile Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - identity
  - enterprise-readiness
status: done
---

# Frontend Identity Profile Contract Helper Move 2026-06-18

## Context

The post-project-mutation-detail contract size re-scan showed `agentfeed-frontend/src/lib/identity-profile-contracts.contract.test.ts` as the largest remaining contract test at 67 pure LOC. The file already used `identity-profile-contract-fixtures.ts`, but avatar/profile/comment assertions were still inline.

## Changed

- Moved avatar user, id-only avatar display, GitHub avatar fallback, comment avatar, and profile link assertion helpers into existing `src/lib/identity-profile-contract-fixtures.ts`.
- Reduced `src/lib/identity-profile-contracts.contract.test.ts` to invoking `assertIdentityProfileContracts()`.
- Preserved existing identity/profile/avatar/comment contract behavior without runtime app changes.
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
  - `src/lib/identity-profile-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/identity-profile-contract-fixtures.ts`: 170 lines / 154 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `7b4f769` — `Move identity profile contract helpers`

## Follow-up

- Keep identity/profile contract helpers in `identity-profile-contract-fixtures.ts`.
- Re-scan fixture/helper sizes before adding more cases to `identity-profile-contract-fixtures.ts`, now 154 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

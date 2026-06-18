---
title: Frontend Auth Theme Social Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - enterprise-readiness
status: done
---

# Frontend Auth Theme Social Contract Fixture Split 2026-06-18

## Context

The post-identity-profile contract size re-scan showed `agentfeed-frontend/src/lib/auth-theme-social-contracts.contract.test.ts` tied for largest remaining contract test at 65 pure LOC.

## Changed

- Split follow/auth/comment intent assertions, optimistic social action assertions, and theme bootstrap assertions into `src/lib/auth-theme-social-contract-fixtures.ts`.
- Reduced `src/lib/auth-theme-social-contracts.contract.test.ts` to invoking `assertAuthThemeSocialContracts()`.
- Preserved existing auth/theme/social contract behavior without runtime app changes.
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
  - `src/lib/auth-theme-social-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/auth-theme-social-contract-fixtures.ts`: 102 lines / 82 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `dcc2594` — `Split auth theme social contract fixtures`

## Follow-up

- Keep auth/theme/social contract cases in `auth-theme-social-contract-fixtures.ts`.
- [x] `cli-authorize-session.contract.test.ts` handled in [[Frontend CLI Authorize Session Contract Fixture Split 2026-06-18]]. Remaining next re-scan candidate: `remaining-read-malformed-response-guards.contract.test.ts` at 65 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

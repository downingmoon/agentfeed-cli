---
title: Frontend URL Navigation Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - navigation
  - enterprise-readiness
status: done
---

# Frontend URL Navigation Contract Fixture Split 2026-06-18

## Context

The next frontend contract size scan after [[Frontend API Response Hardening Contract Helper Move 2026-06-18]] showed `agentfeed-frontend/src/lib/url-navigation-contracts.contract.test.ts` tied for largest remaining contract test at 67 pure LOC.

## Changed

- Split review origin, worklog detail/review/permalink, project href, and dashboard recent worklog URL assertions into `src/lib/url-navigation-contract-fixtures.ts`.
- Reduced `src/lib/url-navigation-contracts.contract.test.ts` to invoking `assertUrlNavigationContracts()`.
- Preserved the existing URL navigation contract behavior without runtime app changes.
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
  - `src/lib/url-navigation-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/url-navigation-contract-fixtures.ts`: 105 lines / 81 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `f1a75ff` — `Split URL navigation contract fixtures`

## Follow-up

- Keep URL navigation cases in `url-navigation-contract-fixtures.ts`.
- [x] `project-mutation-detail-adapters.contract.test.ts` handled in [[Frontend Project Mutation Detail Adapter Fixture Split 2026-06-18]].
- [x] `identity-profile-contracts.contract.test.ts` handled in [[Frontend Identity Profile Contract Helper Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

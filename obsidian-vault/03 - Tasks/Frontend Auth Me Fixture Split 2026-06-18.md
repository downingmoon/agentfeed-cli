---
title: Frontend Auth Me Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - enterprise-readiness
status: done
---

# Frontend Auth Me Fixture Split 2026-06-18

## Context

The post-metadata assertion move re-scan showed `agentfeed-frontend/src/lib/auth-me-contracts.contract.test.ts` as the largest remaining contract test at 50 pure LOC. It still mixed the valid auth.me payload, malformed auth.me cases, and assertion flow in the runner.

## Changed

- Added `src/lib/auth-me-contract-fixtures.ts` for the valid auth.me payload, malformed auth.me cases, normalization assertion, and fail-closed assertion flow.
- Reduced `src/lib/auth-me-contracts.contract.test.ts` to invoking `assertAuthMeContracts()`.
- Preserved existing auth.me normalization contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/auth-me-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/auth-me-contract-fixtures.ts`: 67 lines / 62 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4f485c2` — `Split auth me contract fixtures`

## Follow-up

- Keep auth.me payload fixtures, malformed cases, and assertion flow in `auth-me-contract-fixtures.ts`.
- [x] Remaining next re-scan candidate `project-schema-variants-malformed-strict-fields.contract.test.ts` handled in [[Frontend Project Schema Variant Malformed Assertion Move 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

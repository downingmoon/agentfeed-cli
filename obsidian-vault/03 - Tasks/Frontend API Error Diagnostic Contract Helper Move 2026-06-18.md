---
title: Frontend API Error Diagnostic Contract Helper Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - api
  - enterprise-readiness
status: done
---

# Frontend API Error Diagnostic Contract Helper Move 2026-06-18

## Context

The post-user-activity contract size re-scan showed `agentfeed-frontend/src/lib/api-error-diagnostics.contract.test.ts` tied as the largest frontend contract file at 68 pure LOC. It already used `api-error-diagnostics-contract-fixtures.ts`, but the non-JSON auth/mutation error diagnostics and JSON backend envelope assertions were still inline.

## Changed

- Moved API error diagnostic assertion helper into existing `src/lib/api-error-diagnostics-contract-fixtures.ts`.
- Kept `src/lib/api-error-diagnostics.contract.test.ts` focused on invoking the exported API error diagnostics contract helper.
- Preserved existing non-JSON error fail-closed behavior, safe diagnostic surfacing, secret redaction, backend `error.code` preservation, and raw JSON diagnostic retention without runtime app changes.
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
  - `src/lib/api-error-diagnostics.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/api-error-diagnostics-contract-fixtures.ts`: 101 lines / 87 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `1d4f75a` — `Move API error diagnostic contract helpers`

## Follow-up

- Keep API error diagnostic assertions in `api-error-diagnostics-contract-fixtures.ts`.
- Re-scan found `api-response-body-hardening.contract.test.ts` tied as the largest contract file and split fixtures in [[Frontend API Response Body Hardening Fixture Split 2026-06-18]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

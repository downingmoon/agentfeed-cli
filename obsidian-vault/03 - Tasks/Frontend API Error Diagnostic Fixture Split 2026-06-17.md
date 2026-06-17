---
title: Frontend API Error Diagnostic Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api
  - diagnostics
  - enterprise-readiness
status: done
---

# Frontend API Error Diagnostic Fixture Split 2026-06-17

## Context

After the security header contract fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-error-diagnostics.contract.test.ts` tied as the largest frontend contract file at 81 pure LOC. Non-JSON error bodies, response init fixtures, backend error envelope fixtures, and error-capture helpers were still inline in the contract test.

## Changed

- Added `src/lib/api-error-diagnostics-contract-fixtures.ts` for non-JSON auth/publish error bodies, response init fixtures, the backend privacy-finding error envelope, response construction, and error capture.
- Kept `src/lib/api-error-diagnostics.contract.test.ts` focused on validating safe non-JSON diagnostics, secret redaction, user-facing `ApiError.message` content, backend status preservation, backend `error.code` preservation, and raw JSON envelope diagnostics.
- Preserved existing API error diagnostic contract behavior without runtime app changes.
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
  - `src/lib/api-error-diagnostics.contract.test.ts`: 75 lines / 68 pure LOC
  - `src/lib/api-error-diagnostics-contract-fixtures.ts`: 40 lines / 33 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `55358f2` — `Split API error diagnostic fixtures`

## Follow-up

- Keep API error diagnostic fixtures and capture helper in `api-error-diagnostics-contract-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

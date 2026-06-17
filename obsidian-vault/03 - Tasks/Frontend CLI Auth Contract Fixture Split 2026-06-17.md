---
title: Frontend CLI Auth Contract Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - cli-auth
  - enterprise-readiness
status: done
---

# Frontend CLI Auth Contract Fixture Split 2026-06-17

## Context

After the API fetch timeout fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/cli-auth.contract.ts` tied as the largest frontend contract file at 84 pure LOC. It owned CLI auth session/exchange response fixtures and expected request contracts inline.

## Changed

- Added `src/lib/cli-auth-contract-fixtures.ts` for CLI session/exchange/approve response fixtures and expected CLI auth request contracts.
- Kept `src/lib/cli-auth.contract.ts` focused on OAuth next path, API client calls, and request/response assertions.
- Preserved existing CLI auth contract behavior without runtime app changes.
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
  - `src/lib/cli-auth.contract.ts`: 49 lines / 41 pure LOC
  - `src/lib/cli-auth-contract-fixtures.ts`: 68 lines / 63 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `9d5c22b` — `Split CLI auth contract fixtures`

## Follow-up

- Keep CLI auth response and expected request fixtures in `cli-auth-contract-fixtures.ts`.
- [x] Next re-scan found `api-fetch-request-hardening.contract.test.ts` as the largest contract file and moved cases in [[Frontend API Fetch Request Header Case Move 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

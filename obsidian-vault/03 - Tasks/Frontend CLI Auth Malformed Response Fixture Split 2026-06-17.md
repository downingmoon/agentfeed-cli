---
title: Frontend CLI Auth Malformed Response Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - cli-auth
  - enterprise-readiness
status: done
---

# Frontend CLI Auth Malformed Response Fixture Split 2026-06-17

## Context

After the identity profile fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/cli-auth-malformed-response.contract.test.ts` as the largest frontend contract file at 129 pure LOC. It mixed malformed CLI auth response cases with fail-closed assertion flow.

## Changed

- Added `src/lib/cli-auth-malformed-response-fixtures.ts` for malformed session, exchange, and approve response cases.
- Kept `src/lib/cli-auth-malformed-response.contract.test.ts` focused on fail-closed 502 contract assertion flow.
- Preserved existing CLI auth malformed-response contract behavior without runtime app changes.
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
  - `src/lib/cli-auth-malformed-response.contract.test.ts`: 30 lines / 26 pure LOC
  - `src/lib/cli-auth-malformed-response-fixtures.ts`: 112 lines / 110 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `5cf7aad` — `Split CLI auth malformed response fixtures`

## Follow-up

- Keep malformed CLI auth response cases separate from fail-closed assertion flow when adding future CLI auth response coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

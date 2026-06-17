---
title: Frontend API Response Hardening Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api-client
  - enterprise-readiness
status: done
---

# Frontend API Response Hardening Fixture Split 2026-06-17

## Context

After the notification URL fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-response-hardening.contract.test.ts` as the largest frontend contract file at 130 pure LOC. It mixed auth user/error fixtures and the local API error assertion helper with response hardening behavior checks.

## Changed

- Added `src/lib/api-response-hardening-fixtures.ts` for `jsonResponse`, the auth user response fixture, malformed auth error bodies, and the API error assertion helper.
- Kept `src/lib/api-response-hardening.contract.test.ts` focused on auth response hardening, malformed error envelope, and auth-error event behavior assertions.
- Preserved existing API response hardening contract behavior without runtime app changes.
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
  - `src/lib/api-response-hardening.contract.test.ts`: 99 lines / 93 pure LOC
  - `src/lib/api-response-hardening-fixtures.ts`: 43 lines / 39 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `289eacd` — `Split API response hardening fixtures`

## Follow-up

- Keep API response hardening fixtures/helpers separate from auth-error behavior assertions when adding future hardening coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

---
title: Frontend Notification URL Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - notifications
  - enterprise-readiness
status: done
---

# Frontend Notification URL Fixture Split 2026-06-17

## Context

After the API request fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/notification-url-contracts.contract.test.ts` as the largest frontend contract file at 130 pure LOC. It mixed notification actor fixtures and unsafe external URL cases with URL/path assertion logic.

## Changed

- Added `src/lib/notification-url-contract-fixtures.ts` for notification actor fixtures and unsafe external URL cases.
- Kept `src/lib/notification-url-contracts.contract.test.ts` focused on notification href, path segment, and external URL sanitizer assertions.
- Preserved existing notification URL contract behavior without runtime app changes.
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
  - `src/lib/notification-url-contracts.contract.test.ts`: 84 lines / 72 pure LOC
  - `src/lib/notification-url-contract-fixtures.ts`: 58 lines / 54 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `8b71bbb` — `Split notification URL contract fixtures`

## Follow-up

- Keep notification URL fixtures and unsafe external URL case lists separate from assertion flow when adding future notification URL coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

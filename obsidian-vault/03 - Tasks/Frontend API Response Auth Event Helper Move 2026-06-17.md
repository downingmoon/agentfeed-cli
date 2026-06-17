---
title: Frontend API Response Auth Event Helper Move 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - api
  - auth
  - enterprise-readiness
status: done
---

# Frontend API Response Auth Event Helper Move 2026-06-17

## Context

After the settings profile save expectation move, the next contract size re-scan showed `agentfeed-frontend/src/lib/api-response-hardening.contract.test.ts` as the largest frontend contract file at 80 pure LOC. It already used `api-response-hardening-fixtures.ts`, but auth-error event action dispatch and window event-recorder setup were still inline in the contract test.

## Changed

- Moved auth-error event action dispatch into existing `src/lib/api-response-hardening-fixtures.ts`.
- Added an auth event recorder installer/restorer helper to the same fixture module.
- Kept `src/lib/api-response-hardening.contract.test.ts` focused on validating unexpected auth fields, malformed error envelopes, auth-error categorization, and global auth-error event behavior.
- Preserved existing API response hardening contract behavior without runtime app changes.
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
  - `src/lib/api-response-hardening.contract.test.ts`: 72 lines / 68 pure LOC
  - `src/lib/api-response-hardening-fixtures.ts`: 97 lines / 89 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `ff371c9` — `Move API response auth event helpers`

## Follow-up

- Keep API response auth-event action/window helpers in `api-response-hardening-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

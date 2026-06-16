---
title: Frontend API Error List Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - api-errors
  - list-envelope
  - enterprise-readiness
status: done
---

# Frontend API Error List Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed API error display safety and malformed list-envelope fallback checks into the broad API omnibus contract file. These checks protect UI surfaces from leaking raw Backend diagnostics and from rendering malformed paginated responses as valid data.

## Changed

- Moved existing `ApiError`, `apiErrorCategory`, `apiErrorDisplayMessage`, and `normalizeListResponse` assertions into `src/lib/api-error-list-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused API error/list imports and 26 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - `ApiError.message` stays safe for user-facing rendering and does not leak raw backend traceback/token text.
  - raw response bodies remain available only through diagnostic fields.
  - status categories remain available for UI decisions.
  - status-based display messages stay generic.
  - malformed list envelopes fail closed to empty pages while preserving valid rows/cursors and rejecting malformed `has_more` values.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 87 lines / 65 pure LOC
  - `src/lib/api-error-list-contracts.contract.test.ts`: 27 lines / 23 pure LOC
  - `scripts/run-contract-tests.mjs`: 162 lines / 153 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `d43596c` — `Split API error list contracts`

## Follow-up

- [x] Theme/auth-action/social-action helpers were split in [[Frontend Auth Theme Social Contract Split 2026-06-16]], removing the final `api-contract.test.ts` omnibus file.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

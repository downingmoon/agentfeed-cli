---
title: Frontend Worklog Author View Model Type Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - enterprise-hardening
aliases:
  - Worklog author view model type guard
---

# Frontend Worklog Author View Model Type Guard 2026-06-10

## Context

Worklog cards and details carry a hydrated `_author` view-model field so public surfaces can show GitHub avatars, display names, and handles without falling back to legacy string IDs. The previous implementation preserved behavior, but several boundaries relied on TypeScript casts:

- `adaptWorklogCard` cast its object literal to `Worklog & { _author: User }`.
- `adaptWorklog` recast the card result.
- `useWorklog` recast the adapted detail before reading `_author`.
- `worklogAuthor.ts` recast worklog objects to read `_author`.

## Changed

- Added `WorklogWithAuthor` and `WorklogAuthorView` to `src/lib/types.ts`.
- Updated adapters to return `WorklogWithAuthor` directly.
- Updated `useWorklog` to read `adapted._author` from the explicit adapter return type.
- Updated `getWorklogAuthor` to accept `WorklogAuthorView` and read `_author` without casts.
- Added source contract guards to prevent regression to the previous casts.

## Verification

- Red contract confirmed: `npm run test:contracts` failed before implementation on the new explicit author type guard.
- Green contract: `npm run test:contracts` passed.
- Typecheck: `npm run lint` passed.
- Full frontend CI: DNS-less `npm run ci` passed.
- Cross-repo OpenAPI gate: `node scripts/check-openapi-contract.mjs` passed in `agentfeed-dev`.
- UI smoke: mocked `/worklogs/author-smoke` rendered `Explicit author view model smoke`, `Downing Moon`, and `@downingmoon ·` from hydrated author data.
- LSP diagnostics were unavailable because `typescript-language-server` is not installed locally; `tsc --noEmit` covered type validation.

## Deployment

No server deployment was performed. Current goal explicitly keeps server/infra/CICD work on hold.

## Follow-ups

- [[Frontend Public User Stats Normalization Cleanup]]: remaining `BackendProjectStats` assertion in `api.ts` should be removed in a focused parser pass.
- [[Frontend Normalizer Record Boundary Cleanup]]: top-level `value as Record<string, unknown>` normalizer casts should be reviewed separately from domain union casts.
- [[Frontend Feed Worklog Author Type Adoption]]: feed-local `FeedWorklog = Worklog & { _author?: User }` can be replaced with `WorklogAuthorView` or `WorklogWithAuthor` where appropriate.

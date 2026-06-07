---
title: Search Project Pagination Dedupe 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/search
  - completed
status: completed
---

# Search Project Pagination Dedupe 2026-06-08

> [!success]
> Search pagination now preserves distinct projects when different owners use the same project slug.

## Problem

`/search` already rendered project links with owner-aware routes, but the load-more merge logic deduped raw project rows by `slug` alone. Because backend project slugs are unique per owner, two different users can legitimately have the same slug. In that case, loading another search page could collapse a valid project row before the UI rendered it.

## Fix summary

- Added `src/lib/project-result-key.ts`.
- `projectResultKey()` now builds stable project result keys in this order:
  - `owner/<owner username or id>/slug/<slug>` when owner identity and slug are available.
  - `legacy/<slug>` for legacy/ownerless slug rows.
  - `id/<id>` when the route slug is missing.
- `SearchPage` load-more merge now uses `projectResultKey` instead of `slug`-only dedupe.
- Kept existing owner-aware rendering keys/routes unchanged.

## Regression coverage

- Added API contract coverage proving duplicate slugs from `alice` and `bob` produce distinct keys.
- Added source contract coverage requiring `SearchPage` to import and use `projectResultKey` for pagination merge.
- RED evidence: `npm test` failed before implementation because `./project-result-key` did not exist.

## Verification

- `npm test` ✅
- `npm run lint` ✅
- `bash scripts/test-all.sh` from `agentfeed-dev` ✅
  - CLI release preflight passed.
  - Frontend typecheck/contracts/mock compatibility/build/audit passed.
  - Backend ruff/pytest/offline Alembic chain passed.
  - OpenAPI contract gate remained green.

## Follow-up

- No backend/API schema change was required.
- No server deployment was performed.
- If another frontend surface merges raw `ApiProjectSummary` pages outside existing `ProjectsPage`/`ProfilePage` owner-aware keys, reuse `projectResultKey()` rather than `slug` alone.

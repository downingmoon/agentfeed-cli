---
title: Project Key Helper Consolidation 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/projects
  - completed
status: completed
---

# Project Key Helper Consolidation 2026-06-08

> [!success]
> Project list/render dedupe keys are now centralized so owner-aware project identity cannot drift between Search, Projects, Profile, and Explore surfaces.

## Problem

The previous pass added `projectResultKey()` for `/search` load-more merges, but other project surfaces still repeated inline key expressions such as `owner/slug` or `slug/name`. Those expressions were currently compatible, but they made future drift likely because backend project slugs are unique per owner and frontend has both raw `ApiProjectSummary` rows and adapted `Project` rows.

## Fix summary

- Extended `projectResultKey()` to support adapted `Project` rows where `owner` is already a username string.
- Reused `projectResultKey()` in:
  - `/projects` initial list, load-more list, create-success merge, and render keys.
  - `/profile/:username` project initial/load-more lists and render keys.
  - `/explore` trending project render keys.
  - `/search` project render keys in addition to the existing load-more merge.
- Kept existing owner-aware routes via `projectHref()` unchanged.

## Regression coverage

- Added API contract coverage for adapted `Project.owner: string` support in `projectResultKey()`.
- Updated source contracts so project surfaces must import and reuse the shared helper instead of repeating inline key expressions.
- RED evidence: `npm test` failed before implementation because `projectResultKey()` did not accept adapted `Project.owner` string rows.

## Verification

- Frontend `npm test` ✅
- Frontend `npm run lint` ✅
- Cross-repo `bash scripts/test-all.sh` from `agentfeed-dev` ✅
  - CLI release preflight passed.
  - Frontend typecheck/contracts/mock compatibility/build/audit passed.
  - Backend ruff/pytest/offline Alembic chain passed.
  - OpenAPI contract gate remained green.

## Follow-up

- No backend/API schema change was required.
- No server deployment was performed.
- If future project-rendering surfaces appear, import `projectResultKey()` instead of inventing another project key string.

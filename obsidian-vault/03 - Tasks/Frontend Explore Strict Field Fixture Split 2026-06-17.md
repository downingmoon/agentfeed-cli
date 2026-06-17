---
title: Frontend Explore Strict Field Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - explore
  - enterprise-readiness
status: done
---

# Frontend Explore Strict Field Fixture Split 2026-06-17

## Context

After the owner project detail fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/explore-strict-fields.contract.test.ts` as the largest frontend contract file at 140 pure LOC. It mixed explore response fixtures with strict-field normalization and fail-closed assertions.

## Changed

- Added `src/lib/explore-strict-fields-fixtures.ts` for public user, worklog card, project, prompt, rising builder, category, and full explore section fixtures.
- Kept `src/lib/explore-strict-fields.contract.test.ts` focused on `normalizeExploreSection(...)` and strict-field fail-closed assertions.
- Preserved existing explore response strict-field behavior without runtime app changes.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/explore-strict-fields.contract.test.ts`: 36 lines / 33 pure LOC
  - `src/lib/explore-strict-fields-fixtures.ts`: 119 lines / 113 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `f16314b` — `Split explore strict field fixtures`

## Follow-up

- Keep explore strict-field fixtures separate from normalization/fail-closed assertions when adding future explore response coverage.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

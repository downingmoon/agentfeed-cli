---
title: Frontend Remaining Read Response Guard Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - read-models
  - enterprise-readiness
status: done
---

# Frontend Remaining Read Response Guard Split 2026-06-17

## Context

After the contract runner source registry split, the next contract size re-scan showed `agentfeed-frontend/src/lib/remaining-read-response-guards.contract.test.ts` at 149 pure LOC. It mixed read-model fixtures, valid payload preservation checks, and malformed fail-closed cases for moderation, dashboard, notifications, activity, suggestions, and tags.

## Changed

- Added `src/lib/remaining-read-response-fixtures.ts` for moderation, dashboard, notification, activity, suggestion, and tag fixtures.
- Added `src/lib/remaining-read-malformed-response-guards.contract.test.ts` for malformed read payload fail-closed cases.
- Kept `src/lib/remaining-read-response-guards.contract.test.ts` focused on valid dashboard/activity/moderation/notification/discovery payload preservation.
- Registered the malformed read response guard in `scripts/contract-test-sources.mjs`.
- Preserved these existing guarantees:
  - valid moderation reports, dashboard summaries/recent worklogs, notifications, activity, suggestions, and tags are preserved.
  - malformed report status, dashboard counters/action URLs/pagination, notification type/target/read/pagination, activity token counts, suggestion types/fields, and tag counts/fields fail closed with the expected diagnostics.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/remaining-read-response-guards.contract.test.ts`: 65 lines / 60 pure LOC
  - `src/lib/remaining-read-malformed-response-guards.contract.test.ts`: 70 lines / 65 pure LOC
  - `src/lib/remaining-read-response-fixtures.ts`: 66 lines / 61 pure LOC
  - `scripts/contract-test-sources.mjs`: 132 lines / 130 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `06f50e1` — `Split remaining read response guards`

## Follow-up

- Keep valid read payload preservation checks, malformed fail-closed cases, and shared fixtures separated when adding future read-model coverage.
- [x] Next re-scan found `owner-project-detail-contracts.contract.test.ts` as the largest contract file and split fixtures in [[Frontend Owner Project Detail Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

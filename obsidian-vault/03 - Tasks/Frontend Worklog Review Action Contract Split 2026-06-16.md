---
title: Frontend Worklog Review Action Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - review
  - privacy
  - enterprise-readiness
status: done
---

# Frontend Worklog Review Action Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed worklog review action predicates and privacy preview safety checks into the broad API omnibus contract file. These checks protect review/publish/unpublish/comment controls and private-to-public preview boundaries, so they should be isolated as a focused worklog review contract surface.

## Changed

- Moved existing `canUnpublishWorklog`, `canSubmitComment`, `canPublishWorklog`, `reviewPreviewSafety`, and `hasBlockingPrivacyFindings` assertions into `src/lib/worklog-review-action-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused review action imports and 151 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - unpublish controls appear only for published public/unlisted worklogs.
  - comment submit is locked for pending, blank, or unauthorized states.
  - unresolved high/critical/unknown privacy findings block publishing.
  - unsafe public preview mirrors are detected unless Backend marks a safe public preview with private fields excluded.
  - malformed privacy finding severities fail closed as blocking.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 379 lines / 335 pure LOC
  - `src/lib/worklog-review-action-contracts.contract.test.ts`: 151 lines / 126 pure LOC
  - `scripts/run-contract-tests.mjs`: 159 lines / 150 pure LOC

## Follow-up

- Continue splitting remaining `api-contract.test.ts` clusters: public user parser guards, leaderboard parser guards, API error/display behavior, notification/path/external URL helpers, theme/auth-action/social-action helpers.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

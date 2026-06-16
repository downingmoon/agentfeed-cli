---
title: Frontend Notification URL Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - notifications
  - url-safety
  - enterprise-readiness
status: done
---

# Frontend Notification URL Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed notification route-building, dynamic path segment encoding, and external URL sanitizer checks into the broad API omnibus contract file. These checks protect Frontend navigation from Backend identifier drift, broken profile routes, comment/worklog target ambiguity, and unsafe project links, so they should live in a focused URL-helper contract surface.

## Changed

- Moved existing `notificationHref`, `pathSegment`, and `safeExternalUrl` assertions into `src/lib/notification-url-contracts.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed now-unused notification/path/external URL imports and 143 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - follower notifications link to profile username instead of Backend UUID.
  - user notifications without usernames do not link to broken UUID profile routes.
  - worklog/comment notification IDs are encoded before internal route construction.
  - comment notifications prefer parent worklog IDs when present and keep legacy fallback behavior when absent.
  - backend-provided usernames with route characters are encoded.
  - external project URLs normalize bare domains to HTTPS and reject unsafe protocols, local/internal hosts, credentials, reserved IPv4 ranges, and unsafe IPv6 forms.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 113 lines / 88 pure LOC
  - `src/lib/notification-url-contracts.contract.test.ts`: 143 lines / 130 pure LOC
  - `scripts/run-contract-tests.mjs`: 161 lines / 152 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `0216192` — `Split notification URL contracts`

## Follow-up

- [x] API error/display behavior and list envelope fallback were split in [[Frontend API Error List Contract Split 2026-06-16]].
- Continue splitting remaining `api-contract.test.ts` cluster: theme/auth-action/social-action helpers.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

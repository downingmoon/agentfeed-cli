---
title: Frontend Auth Next Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - enterprise-readiness
status: done
---

# Frontend Auth Next Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` still mixed OAuth `next` path sanitization and GitHub OAuth URL encoding checks into the broad API omnibus contract file. These checks are security-sensitive auth redirect contracts and should be isolated from unrelated API surface checks so future auth changes can be reviewed against a focused safety boundary.

## Changed

- Moved existing `authNextPath` and `auth.githubUrl` redirect-safety assertions into `src/lib/auth-next-contracts.contract.test.ts`.
- Later ownership split: route/hash/query cases live in `auth-next-contract-fixtures.ts`, and 2026-06-18 [[Frontend Auth Next Assertion Move 2026-06-18]] moved assertion flow into `auth-next-contract-assertions.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed the now-unused auth imports and 153 lines from `api-contract.test.ts` without changing runtime behavior.
- Preserved these existing guarantees:
  - OAuth `next` preserves safe route/query/hash state for feed, search, review, profile, dashboard, settings, notifications, and moderation routes.
  - unsafe query keys such as `token`, CLI `session_id`, and `status_token` are stripped.
  - unsafe path/hash inputs fall back to `/` or the safe base path.
  - `auth.githubUrl` keeps sanitized nested `next` values inside the encoded OAuth parameter and does not leak nested query params to the top level.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 845 lines / 719 pure LOC
  - `src/lib/auth-next-contracts.contract.test.ts`: originally 153 lines / 124 pure LOC; 2026-06-18 split result is 3 lines / 2 pure LOC runner plus 77 lines / 67 pure LOC assertion helper
  - `scripts/run-contract-tests.mjs`: 153 lines / 144 pure LOC

## Follow-up

- [x] OAuth next assertion flow moved in [[Frontend Auth Next Assertion Move 2026-06-18]].
- Continue splitting remaining `api-contract.test.ts` clusters: list merge, review origin/navigation, direct worklog body/API surface checks, and auth.me normalization.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

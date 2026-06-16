---
title: Frontend CLI Auth Malformed Response Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - cli-auth
  - enterprise-readiness
status: done
---

# Frontend CLI Auth Malformed Response Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/cli-auth.contract.ts` was the only non-CI frontend contract file still above 200 pure LOC after the documented warning-band splits. It mixed the happy-path CLI browser authorization flow route/body checks with malformed response fail-closed cases for session, approve, and exchange payloads.

## Changed

- Moved malformed CLI auth response cases into `src/lib/cli-auth-malformed-response.contract.test.ts`.
- Kept `src/lib/cli-auth.contract.ts` focused on OAuth next sanitization and valid CLI auth session/approve/exchange route, method, body, and payload preservation.
- Registered the focused malformed-response contract in `scripts/run-contract-tests.mjs`.
- Preserved these existing guarantees:
  - CLI auth status checks call the encoded status-token route.
  - CLI auth approve/exchange calls use POST with exact JSON bodies.
  - valid session, approval, and exchange payloads preserve expected fields.
  - malformed session statuses/timestamps/poll intervals fail closed.
  - malformed exchange token, rotation pair, and user-field payloads fail closed.
  - malformed approve `ok/status` payloads fail closed.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/cli-auth.contract.ts`: 92 lines / 84 pure LOC
  - `src/lib/cli-auth-malformed-response.contract.test.ts`: 134 lines / 129 pure LOC
  - `scripts/run-contract-tests.mjs`: 166 lines / 157 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `924117e` — `Split CLI auth malformed response contracts`

## Follow-up

- Keep CLI auth happy-path flow contracts separate from malformed response/parser fail-closed contracts.
- Next enterprise-readiness pass should re-scan contract file sizes and decide whether any remaining files near 200 pure LOC need split before adding cases.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

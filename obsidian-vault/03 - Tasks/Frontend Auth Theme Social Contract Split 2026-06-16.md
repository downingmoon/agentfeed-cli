---
title: Frontend Auth Theme Social Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - theme
  - social-actions
  - enterprise-readiness
status: done
---

# Frontend Auth Theme Social Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` had been reduced to one final helper-state cluster: auth-gated action intents, optimistic social action state transitions, and theme bootstrap defaults. Keeping that final cluster in an omnibus `api-contract.test.ts` name hid the true ownership and made future contract additions more likely to drift back into the broad file.

## Changed

- Renamed the final remaining omnibus contract file to `src/lib/auth-theme-social-contracts.contract.test.ts`.
- Removed `src/lib/api-contract.test.ts` from `scripts/run-contract-tests.mjs` and registered the focused replacement.
- Preserved these existing guarantees:
  - follow/comment/auth-gated action intents wait for loading auth state, route signed-out users to auth, and act only when signed in and permitted.
  - optimistic social actions wait for unresolved auth state, route signed-out users to auth, block duplicate pending requests, stage like/unlike state, rollback failures, and clear pending state.
  - theme resolution preserves valid themes, fails closed to dark, and bootstrap script synchronizes persisted theme before hydration.
- Eliminated the oversized omnibus `api-contract.test.ts` file after the preceding focused splits.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: removed
  - `src/lib/auth-theme-social-contracts.contract.test.ts`: 87 lines / 65 pure LOC
  - `scripts/run-contract-tests.mjs`: 162 lines / 153 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `4cb059c` — `Split auth theme social contracts`

## Follow-up

- Keep new contract additions out of broad omnibus files; add focused files by API/feature boundary.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- [x] `api-response-hardening.contract.test.ts` warning-band split was handled in [[Frontend API Response Envelope Hardening Split 2026-06-16]].
- Continue reducing remaining warning-band contract files already documented in the enterprise polish log.
- Server/infra/CI/CD work remains held by the active goal constraint.

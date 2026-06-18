---
title: Frontend CLI Authorize Session Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - cli
  - enterprise-readiness
status: done
---

# Frontend CLI Authorize Session Contract Fixture Split 2026-06-18

## Context

The post-auth-theme-social contract size re-scan showed `agentfeed-frontend/src/lib/cli-authorize-session.contract.test.ts` tied for largest remaining contract test at 65 pure LOC.

## Changed

- Split CLI authorize session source-safety checks, fake window/sessionStorage setup, stored-session cases, malformed stored-session cases, incoming query cleanup, and clear-session assertions into `src/lib/cli-authorize-session-contract-fixtures.ts`.
- Reduced `src/lib/cli-authorize-session.contract.test.ts` to invoking `assertCliAuthorizeSessionContracts()`.
- Preserved existing CLI authorize session contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/cli-authorize-session.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/cli-authorize-session-contract-fixtures.ts`: 107 lines / 93 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `e16b2e2` — `Split CLI authorize session contract fixtures`

## Follow-up

- Keep CLI authorize session contract cases in `cli-authorize-session-contract-fixtures.ts`.
- Next re-scan candidate: `remaining-read-malformed-response-guards.contract.test.ts` at 65 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

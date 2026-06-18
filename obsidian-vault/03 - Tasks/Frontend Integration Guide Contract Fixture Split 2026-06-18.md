---
title: Frontend Integration Guide Contract Fixture Split 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - integration
  - enterprise-readiness
status: done
---

# Frontend Integration Guide Contract Fixture Split 2026-06-18

## Context

The post-remaining-mutation contract size re-scan showed `agentfeed-frontend/src/lib/integration-guide-contracts.contract.test.ts` tied as the largest frontend contract file at 70 pure LOC. It still owned integration setup guide valid/malformed payloads, JSON response helper, normalizer checks, and setup-guide client fail-closed runner inline.

## Changed

- Split integration setup guide fixtures and contract runner into `src/lib/integration-guide-contract-fixtures.ts`.
- Kept `src/lib/integration-guide-contracts.contract.test.ts` focused on invoking the exported integration guide contract helper.
- Preserved existing valid CLI command preservation, malformed guide fail-closed behavior, and `integrations.setupGuide` backend payload contract rejection without runtime app changes.
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
  - `src/lib/integration-guide-contracts.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/integration-guide-contract-fixtures.ts`: 73 lines / 66 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `bdfba09` — `Split integration guide contract fixtures`

## Follow-up

- Keep integration setup guide fixtures and contract runner in `integration-guide-contract-fixtures.ts`.
- Next re-scan candidate: `me-settings-mutation-contracts.contract.test.ts` at 70 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

---
title: Frontend Worklog Action Malformed Response Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - worklog-action
  - enterprise-readiness
status: done
---

# Frontend Worklog Action Malformed Response Assertion Move 2026-06-18

## Context

The post-API-fetch-hardening assertion move re-scan showed `agentfeed-frontend/src/lib/worklog-action-malformed-response-guards.contract.test.ts` tied as the largest remaining contract test at 41 pure LOC. It still owned malformed publish/unpublish/resolveFinding cases, response wrapping, fetch override/restore handling, and fail-closed assertion flow directly in the runner.

## Changed

- Added `src/lib/worklog-action-malformed-response-assertions.ts` for malformed publish/unpublish/resolveFinding cases, response helper setup, fetch restore handling, and fail-closed assertion flow.
- Reduced `src/lib/worklog-action-malformed-response-guards.contract.test.ts` to invoking `assertWorklogActionMalformedResponseGuards()` with the existing async failure handler.
- Preserved existing worklog action malformed response guard coverage without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported assertion/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-move verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/worklog-action-malformed-response-guards.contract.test.ts`: 6 lines / 5 pure LOC
  - `src/lib/worklog-action-malformed-response-assertions.ts`: 53 lines / 47 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `7be547f` — `Move worklog action malformed response assertions`

## Follow-up

- Keep worklog action malformed response assertion flow in `worklog-action-malformed-response-assertions.ts`.
- [x] Remaining next re-scan candidate `account-project-mutation-response-guards.contract.test.ts` handled in [[Frontend Account Project Mutation Response Assertion Move 2026-06-19]]. Current next re-scan candidates: `moderation-report-contracts.contract.test.ts` and `leaderboard-user-key.contract.test.ts` at 40 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint unless the deployment gate is explicitly confirmed separately.

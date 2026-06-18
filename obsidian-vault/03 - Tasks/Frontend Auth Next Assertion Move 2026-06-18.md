---
title: Frontend Auth Next Assertion Move 2026-06-18
date: 2026-06-18
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - enterprise-readiness
status: done
---

# Frontend Auth Next Assertion Move 2026-06-18

## Context

The post-project-schema-variant strict assertion move re-scan showed `agentfeed-frontend/src/lib/auth-next-contracts.contract.test.ts` tied as the largest remaining contract test at 44 pure LOC. It already had route/hash/query fixtures in `auth-next-contract-fixtures.ts`, but still owned the `authNextPath` and `auth.githubUrl` assertion flow directly in the runner.

`src/lib/auth-next-contract-fixtures.ts` was already 160 pure LOC, so this pass intentionally avoided growing that fixture file.

## Changed

- Added `src/lib/auth-next-contract-assertions.ts` for OAuth next path assertions, unsafe hash/next rejection assertions, and GitHub OAuth URL next-param assertions.
- Reduced `src/lib/auth-next-contracts.contract.test.ts` to invoking `assertAuthNextContracts()`.
- Kept `src/lib/auth-next-contract-fixtures.ts` unchanged at 160 pure LOC.
- Preserved existing auth redirect safety coverage without runtime app changes.
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
  - `src/lib/auth-next-contracts.contract.test.ts`: 3 lines / 2 pure LOC
  - `src/lib/auth-next-contract-assertions.ts`: 77 lines / 67 pure LOC
  - `src/lib/auth-next-contract-fixtures.ts`: unchanged 163 lines / 160 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `c66022d` — `Move auth next contract assertions`

## Follow-up

- Keep OAuth next assertion flow in `auth-next-contract-assertions.ts`.
- Keep OAuth next route/hash/query cases in `auth-next-contract-fixtures.ts`; re-check size before adding cases because it is 160 pure LOC.
- [x] Tied next re-scan candidate `worklog-review-strict-fields.contract.test.ts` handled in [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]]. Subsequent candidates `project-malformed-response-contracts.contract.test.ts`, `leaderboard-response-contracts.contract.test.ts`, and `worklog-card-response-guards.contract.test.ts` handled in [[Frontend Project Malformed Response Assertion Move 2026-06-18]], [[Frontend Leaderboard Response Assertion Move 2026-06-18]], and [[Frontend Worklog Card Response Assertion Move 2026-06-18]]. Current next re-scan candidates: `social-action-response-guards.contract.test.ts` and `api-fetch-request-hardening.contract.test.ts` at 42 pure LOC.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

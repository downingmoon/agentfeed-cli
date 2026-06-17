---
title: Frontend Auth Next Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - auth
  - enterprise-readiness
status: done
---

# Frontend Auth Next Fixture Split 2026-06-17

## Context

After the worklog review action fixture split, the next contract size re-scan showed `agentfeed-frontend/src/lib/auth-next-contracts.contract.test.ts` as the largest frontend contract file at 124 pure LOC. It mixed OAuth next path/query/hash cases and unsafe input lists with OAuth URL assertions.

## Changed

- Added `src/lib/auth-next-contract-fixtures.ts` for OAuth next path cases, unsafe hash fragments, and unsafe next values.
- Kept `src/lib/auth-next-contracts.contract.test.ts` focused on asserting `authNextPath` and `auth.githubUrl` behavior.
- Preserved existing auth-next contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture helper, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/auth-next-contracts.contract.test.ts`: 54 lines / 44 pure LOC
  - `src/lib/auth-next-contract-fixtures.ts`: 163 lines / 160 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `bc35bb8` — `Split auth next contract fixtures`

## Follow-up

- Keep OAuth next route/hash/query cases separate from OAuth URL assertion flow when adding future auth redirect coverage.
- [x] Next re-scan found `project-mutation-contracts.contract.test.ts` tied as the largest contract file and split fixtures in [[Frontend Project Mutation Contract Fixture Split 2026-06-17]].
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

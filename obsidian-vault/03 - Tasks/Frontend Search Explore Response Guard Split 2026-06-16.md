---
title: Frontend Search Explore Response Guard Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - search
  - explore
  - enterprise-readiness
status: done
---

# Frontend Search Explore Response Guard Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/search-explore-response-guards.contract.test.ts` was the last documented warning-band contract file. It mixed `/search` and `/explore` response parser behavior plus large shared nested worklog/user/project fixtures in one file, making future Backend response drift cases harder to place cleanly.

## Changed

- Replaced the combined `src/lib/search-explore-response-guards.contract.test.ts` with focused contracts:
  - `src/lib/search-response-guards.contract.test.ts`
  - `src/lib/explore-response-guards.contract.test.ts`
- Added `src/lib/search-explore-response-fixtures.ts` for shared nested Backend payload fixtures used by both focused tests.
- Updated `scripts/run-contract-tests.mjs` to run the two focused contract tests.
- Preserved these existing guarantees:
  - search responses preserve valid nested worklog/user/project/prompt payloads and strict pagination.
  - search rejects malformed nested worklog cards, prompt authors, extra data/prompt fields, non-string project slugs, and unexpected project fields.
  - explore responses preserve valid trending worklogs/projects, popular prompts, rising builders, and featured categories.
  - explore rejects malformed nested worklogs, project owners/slugs/tags, prompt counts, builder counts/extra fields, and featured category counts.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/search-explore-response-guards.contract.test.ts`: removed
  - `src/lib/search-response-guards.contract.test.ts`: 69 lines / 64 pure LOC
  - `src/lib/explore-response-guards.contract.test.ts`: 66 lines / 60 pure LOC
  - `src/lib/search-explore-response-fixtures.ts`: 147 lines / 136 pure LOC
  - `scripts/run-contract-tests.mjs`: 165 lines / 156 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `479f33f` — `Split search explore response guards`

## Follow-up

- Keep search and explore response guard cases in separate focused files; keep shared nested payload fixtures in `search-explore-response-fixtures.ts`.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Next enterprise-readiness pass should re-scan for newly oversized contract files rather than adding cases to warning-band files.
- Server/infra/CI/CD work remains held by the active goal constraint.

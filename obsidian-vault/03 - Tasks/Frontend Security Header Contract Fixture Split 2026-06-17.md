---
title: Frontend Security Header Contract Fixture Split 2026-06-17
date: 2026-06-17
tags:
  - agentfeed
  - frontend
  - contract
  - security
  - enterprise-readiness
status: done
---

# Frontend Security Header Contract Fixture Split 2026-06-17

## Context

After the project mutation request expectation move, the next contract size re-scan showed `agentfeed-frontend/src/lib/security-headers.contract.test.ts` as the largest frontend contract file at 83 pure LOC. Static security header lists, IP-only server-test header expectations, CSP directive expectations, and CSP parsing were still inline in the contract test.

## Changed

- Added `src/lib/security-headers-contract-fixtures.ts` for static security header expectations, insecure server-test header expectations, required CSP directive expectations, and CSP directive parsing.
- Kept `src/lib/security-headers.contract.test.ts` focused on validating static headers, IP-only server-test header behavior, nonce-scoped CSP directives, runtime API origin handling, and fail-closed invalid API URL behavior.
- Preserved existing security header and CSP contract behavior without runtime app changes.
- Did not update `scripts/contract-test-sources.mjs` because the new file is an imported fixture/helper module, not a standalone contract source.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- Frontend `git diff --check` ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, eslint-disable, TODO, or FIXME additions.
- Changed-file size audit:
  - `src/lib/security-headers.contract.test.ts`: 66 lines / 60 pure LOC
  - `src/lib/security-headers-contract-fixtures.ts`: 40 lines / 36 pure LOC
- Visual QA: not run because this was a non-UI contract-test refactor.

## Commits

- Frontend: `0a4a7a1` — `Split security header contract fixtures`

## Follow-up

- Keep security header and CSP directive expectations in `security-headers-contract-fixtures.ts`.
- Continue re-scanning current contract file sizes before adding cases to near-200 LOC files.
- Server/infra/CI/CD work remains held by the active goal constraint.

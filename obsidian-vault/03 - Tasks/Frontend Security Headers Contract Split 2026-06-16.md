---
title: Frontend Security Headers Contract Split 2026-06-16
date: 2026-06-16
tags:
  - agentfeed
  - frontend
  - contract
  - enterprise-readiness
status: done
---

# Frontend Security Headers Contract Split 2026-06-16

## Context

`agentfeed-frontend/src/lib/api-contract.test.ts` remained an oversized omnibus contract file. Security header and nonce-scoped CSP checks were mixed into API/parser contract checks, making contract ownership harder to review and increasing the chance that frontend security drift would be hidden inside unrelated API changes.

## Changed

- Moved frontend security header and CSP contract checks into `src/lib/security-headers.contract.test.ts`.
- Registered the focused contract in `scripts/run-contract-tests.mjs`.
- Removed the now-unused security header imports and 90 lines from `api-contract.test.ts` without changing runtime behavior.
- Kept the checks focused on existing enterprise-readiness guarantees:
  - static Next headers must not duplicate middleware-owned CSP.
  - required security headers remain present.
  - IP-only server-test mode omits HSTS/COOP while preserving safer local headers.
  - CSP keeps nonce/strict-dynamic script policy and fail-closed API-origin parsing.

## Verification

> [!success]
> Baseline and post-split verification passed.

- Baseline before edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run test:contracts` ✅
- Frontend after edit: `npm run lint` ✅
- `git diff --check` across changed repos ✅
- Changed-file no-excuse grep ✅ — no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertions, empty catches, or eslint-disable additions; only match was the pre-existing literal text `unknown-user` in a contract fixture.
- Changed-file size audit:
  - `src/lib/api-contract.test.ts`: 1,133 lines / 971 pure LOC
  - `src/lib/security-headers.contract.test.ts`: 90 lines / 83 pure LOC
  - `scripts/run-contract-tests.mjs`: 151 lines / 142 pure LOC

## Follow-up

- Continue splitting remaining `api-contract.test.ts` clusters until no unrelated contract domains are coupled in the omnibus file.
- Keep `scripts/run-contract-tests.mjs` readable; if contract source registration grows materially, split the source list into a dedicated helper module.
- Server/infra/CI/CD work remains held by the active goal constraint.

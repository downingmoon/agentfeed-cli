---
title: Commercial Readiness Hardening - Frontend Mock API Compatibility CI Gate 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/frontend
  - agentfeed/ci
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Frontend mock API compatibility CI gate
  - Frontend compatibility diagnostic CI gate
---

# Frontend mock API compatibility CI gate

> [!success]
> Frontend `npm run ci` now executes the API compatibility diagnostic path against a local mock `/v1/metadata` server, so compatibility code is enforced in normal CI without depending on hosted DNS.

## Context

- Builds on [[Commercial Readiness Hardening - API Compatibility Metadata Handshake 2026-06-02]]
- Hosted/live follow-up: [[Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02]]
- Related frontend script: `scripts/check-api-compatibility.mjs`

## Problem

The Frontend already had `check:api-compatibility`, but normal CI did not run it. Adding a direct live hosted check to regular CI would currently be unsafe because `api.agentfeed.dev` does not resolve from this environment. The required commercial path is therefore split:

1. normal CI must prove the Frontend diagnostic code and compatibility predicate execute correctly;
2. hosted live compatibility remains in the manual hosted smoke after DNS/deployment exists.

## Contract

1. `npm run ci` runs API compatibility before production build.
2. The compatibility CI step does not call `https://api.agentfeed.dev` or depend on external DNS.
3. A local mock server responds to exactly one `GET /v1/metadata` request.
4. Compatible metadata prints `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-02`.
5. Incompatible metadata fails closed with `Backend metadata is not compatible`.
6. Temporary `.tmp-api-compatibility-*` directories are cleaned after success and failure.
7. Production build still uses explicit `NEXT_PUBLIC_API_URL` and remains fail-closed when missing.

## Changes

- Frontend `scripts/mock-api-compatibility-check.mjs`
  - Starts a `127.0.0.1:0` local metadata server.
  - Runs `scripts/check-api-compatibility.mjs` against that mock server.
  - Supports `--incompatible` for fail-closed regression.
  - Verifies exactly one metadata request was made.
- Frontend `scripts/check-api-compatibility.mjs`
  - Replaced direct `process.exit()` inside `fail()` with throw/exit-code flow so `finally` always removes temp compatibility directories.
- Frontend `scripts/run-ci.mjs`
  - Adds `mock API compatibility` before `production build`.
- Frontend `scripts/api-compatibility-mock.contract.test.mjs`
  - Locks package/run-ci wiring, compatible success, incompatible failure, and temp cleanup.
- Frontend `scripts/run-ci.contract.test.mjs`
  - Uses fake `npm` to prove CI step order, env separation, failure propagation, and missing production API URL fail-closed behavior.

## Verification evidence

> [!example] RED
> `npm run test` failed with `package.json must expose a CI-safe mock API compatibility script` before implementation.

> [!bug]
> First implementation used synchronous child execution while the mock HTTP server lived in the parent process. This blocked the event loop, so the child timed out. The runner was corrected to use async `spawn()`.

> [!bug]
> The first failure also exposed that `check-api-compatibility.mjs` leaked `.tmp-api-compatibility-*` directories on failure because `process.exit()` skipped `finally`. The script now exits after cleanup.

> [!success] GREEN — contract suite
> `npm run test` passed, including mock compatibility and run-ci contract tests.

> [!success] GREEN — compatible diagnostic path
> `npm run check:api-compatibility:mock` passed and printed `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-02`.

> [!success] GREEN — incompatible fail-closed path
> `node scripts/mock-api-compatibility-check.mjs --incompatible` exited non-zero, printed `Backend metadata is not compatible`, and left no `.tmp-api-compatibility-*` directories.

> [!success] GREEN — full frontend CI
> `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` passed: typecheck, contracts, mock API compatibility, and production build.

> [!success] GREEN — dependency audit
> `npm audit --omit=dev --audit-level=moderate` passed with 0 vulnerabilities.

## Remaining risk

> [!warning]
> This is a normal-CI diagnostic-path gate, not a hosted live compatibility proof. The hosted smoke still needs a DNS/deployment-ready `api.agentfeed.dev` to prove production runtime compatibility.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02]]

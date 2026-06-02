---
title: Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/dev-orchestration
  - agentfeed/frontend
  - agentfeed/cli
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Hosted compatibility smoke
  - Hosted API metadata compatibility smoke
---

# Hosted compatibility smoke

> [!success]
> The previous `/v1/metadata` compatibility contract now has a read-only hosted smoke harness: Backend metadata, Backend readiness, CLI `doctor`, and Frontend `system.metadata()` compatibility are checked in one reproducible path.

## Context

- Builds on [[Commercial Readiness Hardening - API Compatibility Metadata Handshake 2026-06-02]]
- Related cross-repo gate: [[Commercial Readiness Hardening - Installed CLI Tarball Smoke and Manual Cross Repo CI 2026-06-02]]
- Integration map: [[Integration - CLI Backend Frontend]]

## Problem

The compatibility contract was locally and remotely CI-verified, but the remaining deployment risk was that a hosted Backend could be reachable while still missing the latest `/v1/metadata` contract. This smoke narrows the remaining risk to an explicit post-deploy/manual hosted check.

## Contract

> [!important]
> The hosted compatibility smoke is read-only and auth-free. It does not create OAuth sessions, ingestion tokens, worklogs, or browser cookies.

The smoke must verify:

1. Hosted `GET /v1/metadata` returns `agentfeed-api`, `v1`, `2026-06-02`, and client minimum-version metadata.
2. Hosted `/health/ready` reports database connected and migrations up to date.
3. `agentfeed doctor` against the hosted API reports `API ready: yes` and `API compatibility: yes (v1 / 2026-06-02)` using a temporary HOME/file credential store.
4. Frontend diagnostic runner executes `system.metadata()` and `isBackendCompatible(metadata)` against the same hosted API root.

## Changes

### Frontend

- `scripts/check-api-compatibility.mjs`
  - Compiles a temporary TypeScript runner that imports `system.metadata()` and `isBackendCompatible()` from `src/lib/api.ts`.
  - Requires explicit `NEXT_PUBLIC_API_URL`.
  - Prints `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-02` on success.
- `package.json`
  - Added `check:api-compatibility`.

### Dev orchestration

- `scripts/smoke-hosted-compatibility.sh`
  - Resolves the hosted API hostname before curl, then calls hosted metadata/readiness with strict JSON validation, bounded connect/max-time, retries, and classified DNS/timeout/TLS failure messages.
  - Builds and runs the local CLI package entrypoint with `AGENTFEED_API_BASE_URL` forced to the hosted API.
  - Runs the Frontend `check:api-compatibility` diagnostic command.
  - Prints `HOSTED_COMPATIBILITY_SMOKE_PASSED` on success.
- `.github/workflows/hosted-compatibility.yml`
  - Manual `workflow_dispatch` hosted smoke.
  - Requires `AGENTFEED_CI_REPO_READ_TOKEN` to checkout private CLI/Frontend repos.
  - Uses SHA-pinned GitHub actions.
- `scripts/test-hosted-compatibility-smoke.sh`
  - Locks the script/workflow/package contract without calling production during normal local gates.
- `scripts/test-all.sh`, `Makefile`, `README.md`
  - Added syntax/static contract coverage and `make smoke-hosted-compatibility`.

## Verification evidence

> [!example] RED
> `./scripts/test-hosted-compatibility-smoke.sh` initially failed with `missing hosted compatibility smoke script`.

> [!bug]
> The first Frontend runner implementation failed because it wrote the temporary TypeScript source into the system temp directory, breaking the relative import of `src/lib/api.ts`. It was corrected to use a project-local temporary directory and to discover the compiled `runner.js` path.

> [!success] GREEN — Frontend diagnostic runner mock
> `NEXT_PUBLIC_API_URL=http://127.0.0.1:18181 npm run check:api-compatibility` passed against a local mock `/v1/metadata` server and printed `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-02`.

> [!success] GREEN — hosted harness mock E2E
> `AGENTFEED_HOSTED_API_BASE_URL=http://127.0.0.1:18182/v1 AGENTFEED_HOSTED_API_ROOT_URL=http://127.0.0.1:18182 ./scripts/smoke-hosted-compatibility.sh` passed against a local mock metadata/readiness server and printed `HOSTED_COMPATIBILITY_SMOKE_PASSED`.


> [!success] GREEN — DNS/deployment failure clarity
> `make smoke-hosted-compatibility` against default `https://api.agentfeed.dev/v1` now fails before curl with `Hosted API host did not resolve: api.agentfeed.dev` and points to DNS/deployment or `AGENTFEED_HOSTED_API_BASE_URL` override.

> [!success] GREEN — curl timeout/retry contract
> `./scripts/test-hosted-compatibility-smoke.sh` now asserts `AGENTFEED_CURL_CONNECT_TIMEOUT`, `AGENTFEED_CURL_MAX_TIME`, and `AGENTFEED_CURL_RETRIES`, plus a deterministic slow local metadata server that must fail with `Backend metadata request timed out` and timeout tuning hints.

> [!success] GREEN — Dev full gate
> `./scripts/test-all.sh` passed: dev static contracts, OpenAPI gate, CLI 326 tests/typecheck/release preflight/audit, Frontend CI/audit, Backend ruff/287 pytest/Alembic offline chain.

> [!success] GREEN — Frontend full gate
> `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci && npm audit --omit=dev --audit-level=moderate` passed: typecheck, contract tests, production build, and 0 vulnerabilities.

## Remaining risk

> [!warning]
> The actual production hosted smoke currently fails because `api.agentfeed.dev` does not resolve from this environment. That is now captured as a DNS/deployment readiness issue rather than an ambiguous curl failure. Run the smoke again after DNS/deployment is configured.

> [!todo]
> Next candidate: add deployment automation or a deploy-status note that records the first successful `make smoke-hosted-compatibility` result against `https://api.agentfeed.dev/v1` after release.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Integration - CLI Backend Frontend#2026-06-02 hosted compatibility smoke]]

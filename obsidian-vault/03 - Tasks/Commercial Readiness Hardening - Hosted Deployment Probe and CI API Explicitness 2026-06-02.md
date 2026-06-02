---
title: Commercial Readiness Hardening - Hosted Deployment Probe and CI API Explicitness 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/hosted
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/dev
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Hosted deployment probe hardening
  - Frontend explicit API CI
---

# Hosted deployment probe and CI API explicitness

> [!success]
> Hosted deployment readiness is now narrower and more automatable: Frontend CI no longer accepts an implicit production API fallback, Backend supports `/v1`-scoped health probes, and Dev hosted smoke captures structured transport diagnostics plus root and `/v1` readiness evidence.

## Context

- Related MOC: [[AgentFeed CLI MOC]].
- Related task board: [[Active Tasks]].
- Builds on [[Commercial Readiness Hardening - Hosted Failure Evidence 2026-06-02]], [[Commercial Readiness Hardening - Backend Production Deploy Contract 2026-06-02]], and [[Commercial Readiness Hardening - CLI Release Workflow Parity 2026-06-02]].

## Current hosted evidence

> [!warning]
> Current hosted smoke still fails externally: `https://agentfeed.dev/` returns HTTP `307` to `/login`, and `api.agentfeed.dev` is DNS `NXDOMAIN`. This note closes repo-local automation/probe gaps, not the external deployment itself.

## Problems fixed

1. Frontend CI had an opt-in hosted default fallback through `AGENTFEED_CI_ALLOW_DEFAULT_API=1`, allowing CI/deploy builds to succeed without explicit `NEXT_PUBLIC_API_URL`.
2. Backend readiness probes existed only at root paths (`/health`, `/health/ready`), while operators often configure probes relative to API base URLs such as `/v1/health/ready`.
3. Dev hosted smoke failure JSON had stage/message but not structured transport fields, and workflow timeout/retry values were fixed YAML envs rather than manual-dispatch inputs.
4. Dev OpenAPI contract gate treated the newly added `/v1/health*` probe aliases as unclassified Backend endpoints until they were explicitly marked backend-only deployment probes.

## Contract

- Frontend `scripts/run-ci.mjs` requires explicit `NEXT_PUBLIC_API_URL` for every CI, preview, and production build path.
- Backend exposes both root and API-base health aliases:
  - `/health`
  - `/health/ready`
  - `/v1/health`
  - `/v1/health/ready`
- Backend rate limits all health aliases with IP-based rules.
- Dev `scripts/smoke-hosted-compatibility.sh` checks root readiness and `/v1/health/ready` readiness and requires matching payloads.
- Hosted smoke failure evidence includes `transport.curl_exit_code`, `transport.http_status`, and `transport.stderr` when available.
- Hosted compatibility GitHub workflow exposes `curl_connect_timeout`, `curl_max_time`, and `curl_retries` dispatch inputs.
- Dev OpenAPI contract classifies `/v1/health` and `/v1/health/ready` as backend-only hosted deployment probes, while keeping CLI runtime readiness on `/health/ready`.

## Verification evidence

> [!example] RED
> Frontend contract failed when source checks forbade `AGENTFEED_CI_ALLOW_DEFAULT_API` but `scripts/run-ci.mjs` still contained the fallback.
>
> Backend focused contract failed with 404 / missing route model / missing rate-limit rules for `/v1/health*`.
>
> Dev hosted smoke contract failed before workflow inputs, README override docs, transport diagnostics, and `/v1/health/ready` contract were implemented.

> [!success] GREEN — focused contracts
> Frontend `npm test` passed.
>
> Backend focused readiness/model/rate-limit tests passed.
>
> Dev `./scripts/test-hosted-compatibility-smoke.sh && ./scripts/test-commercial-readiness-gate.sh` passed.

> [!success] GREEN — broader local gates
> Frontend `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` and `npm audit --omit=dev --audit-level=moderate` were run for this slice.
>
> Backend `uv run --locked --group dev ruff check .` and focused contract tests were run for this slice.
>
> Dev `bash -n scripts/smoke-hosted-compatibility.sh scripts/commercial-readiness.sh && ./scripts/check-action-pins.sh` was run for this slice.
>
> Cross-repo `agentfeed-dev ./scripts/test-all.sh` passed after the OpenAPI backend-only probe classifications were added. It covered CLI test/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff plus 296 tests, and the Alembic offline migration chain.

## Remaining risk

> [!warning]
> This does not deploy the hosted services. Final commercial readiness still requires updating the real hosted Frontend deployment and creating/pointing DNS for `api.agentfeed.dev`, then rerunning `make commercial-readiness` until it prints `COMMERCIAL_READINESS_PASSED`.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Hosted Failure Evidence 2026-06-02]]
- [[Commercial Readiness Hardening - Backend Production Deploy Contract 2026-06-02]]
- [[Commercial Readiness Hardening - CLI Release Workflow Parity 2026-06-02]]

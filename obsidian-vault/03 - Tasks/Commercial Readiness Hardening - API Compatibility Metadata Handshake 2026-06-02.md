---
title: Commercial Readiness Hardening - API Compatibility Metadata Handshake 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - API compatibility metadata handshake
  - CLI Frontend Backend compatibility metadata
---

# API compatibility metadata handshake

> [!success]
> Backend now exposes a typed `/v1/metadata` compatibility contract, CLI `doctor` reports API drift before token/upload diagnosis, Frontend has a diagnostic metadata client contract, and `agentfeed-dev` OpenAPI gates the shared wire shape.

## Context

- Related installed-package and cross-repo gate: [[Commercial Readiness Hardening - Installed CLI Tarball Smoke and Manual Cross Repo CI 2026-06-02]]
- Related OpenAPI schema gate: [[Commercial Readiness Hardening - OpenAPI Request Body and Schema Contract Gate 2026-06-02]]
- Integration map: [[Integration - CLI Backend Frontend]]

## Problem

AgentFeed has three separately deployed clients/services:

- CLI package: `agentfeed-cli@0.2.0`
- Backend API: `/v1`, backend version `0.1.0`
- Frontend app: `agentfeed-frontend@0.1.0`

Before this change, clients could prove readiness with `/health/ready`, but they had no explicit contract endpoint for version/contract drift. That means a CLI or Frontend could point to a reachable but incompatible API and only fail later during user workflows.

## Contract

> [!important]
> `/v1/metadata` is the shared compatibility source of truth for CLI and Frontend. The contract is intentionally simple and diagnostic-first.

```json
{
  "data": {
    "service": "agentfeed-api",
    "api_version": "v1",
    "backend_version": "0.1.0",
    "contract_version": "2026-06-02",
    "supported_clients": {
      "cli": {
        "min_version": "0.2.0",
        "contract_version": "2026-06-02"
      },
      "frontend": {
        "min_version": "0.1.0",
        "contract_version": "2026-06-02"
      }
    }
  }
}
```

## Changes

### Backend

- `app/schemas/common.py`
  - Added `ClientCompatibility`, `SupportedClients`, and `ApiMetadataResponse` models.
  - `SupportedClients` is explicit (`cli`, `frontend`) instead of a free `dict`, so OpenAPI exposes concrete nested properties for contract tooling.
- `app/main.py`
  - Added `BACKEND_VERSION`, `API_VERSION`, `API_CONTRACT_VERSION`, and `SUPPORTED_CLIENTS` constants.
  - Added `GET /v1/metadata` with `DataResponse[ApiMetadataResponse]`.
- `app/middleware/rate_limit.py`
  - Added `/v1/metadata` to public IP-based rate-limit coverage.
- `tests/test_contracts.py`
  - Added metadata response and route response-model tests.
  - Extended rate-limit route coverage.

### CLI

- `src/api/client.ts`
  - Added `checkApiCompatibility(apiBaseUrl)`.
  - Added fail-closed semver/contract validation for `api_version`, `contract_version`, and CLI minimum supported version.
- `src/cli/index.ts`
  - `agentfeed doctor` now checks and prints `API compatibility` in addition to readiness and ingestion token validity.
- `tests/api-hook.test.ts`
  - Added `/v1/metadata` fetch contract coverage and malformed `min_version` rejection.
- `tests/cli-status-doctor.test.ts`
  - Added doctor-flow coverage proving `/v1/metadata` is requested and rendered.

### Frontend

- `src/lib/api.ts`
  - Added `system.metadata()` diagnostic client.
  - Added `isBackendCompatible(metadata)` for API/Frontend contract drift checks, including malformed semver rejection.
- `src/lib/api-contract.test.ts`
  - Added metadata endpoint URL/method contract, mismatch rejection, and malformed `min_version` rejection coverage.

### Dev orchestration

- `scripts/check-openapi-contract.mjs`
  - Added shared `GET /v1/metadata` endpoint coverage.
  - Added response-field and schema-field gates for service/version/client compatibility fields.

## Verification evidence

> [!example] RED
> Backend targeted contract tests initially failed because `/v1/metadata` returned `404` and `ApiMetadataResponse` did not exist.

> [!example] RED
> CLI targeted tests initially failed because `checkApiCompatibility` was not exported and `doctor` did not request `/v1/metadata`.

> [!success] GREEN — targeted
> Backend: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -k 'api_metadata or metadata_route_has_response_model or rate_limit_rules_cover'` → 4 passed.

> [!success] GREEN — targeted
> CLI: `npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts -t 'API compatibility|remote token expiry'` → 2 passed / 82 skipped.

> [!success] GREEN — targeted
> Frontend: `npm run test:contracts` passed.

> [!success] GREEN — targeted
> Dev: `node scripts/check-openapi-contract.mjs` passed: 71 OpenAPI operations, 68 client contracts, 80 schema fields.

> [!success] GREEN — full local gates
> CLI: `npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high` passed: 21 files / 326 tests, typecheck, installed package preflight, 0 vulnerabilities.

> [!success] GREEN — full local gates
> Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci && npm audit --omit=dev --audit-level=moderate` passed: typecheck, contract tests, production build, 0 vulnerabilities.

> [!success] GREEN — full local gates
> Backend: `uv run --python 3.12 --locked --group dev ruff check . && uv run --python 3.12 --locked --group dev pytest tests && uv run --python 3.12 --locked alembic upgrade head --sql` passed: ruff, 287 pytest, 490-line offline migration SQL.

> [!success] GREEN — full local gates
> Dev: `./scripts/test-all.sh` passed across CLI, Frontend, Backend, OpenAPI, action pins, and Alembic offline migration chain.

## Remaining risk

> [!warning]
> This is a compatibility metadata handshake, not yet a hosted live smoke against deployed production. Remote CI and hosted runtime validation still need to confirm the same contract after push/deploy.

> [!todo]
> Next candidate: add an explicit hosted smoke that calls production `/v1/metadata`, `agentfeed doctor`, and Frontend diagnostic compatibility in one branch-safe workflow.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Integration - CLI Backend Frontend#2026-06-02 API compatibility metadata handshake]]

---
title: Backend System Routes Module Split 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - refactor
  - system-routes
  - health
  - readiness
  - metadata
status: done
related:
  - "[[Backend Request Boundary Module Split 2026-06-09]]"
  - "[[Backend OpenAPI Contract Module Split 2026-06-09]]"
---

# Backend System Routes Module Split 2026-06-09

## Summary

`app/main.py` remained above the preferred 250 pure LOC ceiling after the OpenAPI and request-boundary splits. This pass moved system-level routes into `app/system_routes.py` without changing route behavior.

## Changes

- Added `app/system_routes.py` with `register_system_routes(app, prefix=...)`.
- Moved these route definitions out of `app/main.py`:
  - `GET /v1/metadata`
  - `GET /health`
  - `GET /v1/health`
  - `GET /health/ready`
  - `GET /v1/health/ready`
- Moved metadata constants and readiness logger with those routes:
  - `BACKEND_VERSION`
  - `API_VERSION`
  - `API_CONTRACT_VERSION`
  - `SUPPORTED_CLIENTS`
- Reduced `app/main.py` pure LOC from `308` to `234`, bringing it below the 250 LOC ceiling.
- New `app/system_routes.py` is `76` pure LOC.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'metadata or health or readiness'
uv run --locked --group dev ruff check app/main.py app/system_routes.py app/request_boundary.py app/openapi_contract.py tests/test_contracts.py
uv run --locked --group dev pytest

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash scripts/test-all.sh
```

Evidence:

- Targeted metadata/health/readiness tests: `33 passed, 367 deselected`.
- Backend full suite: `428 passed, 1 warning`.
- Dev OpenAPI gate: passed with `Strict client JSON error responses checked: 347`.
- Cross-repo `scripts/test-all.sh`: passed for Dev, CLI, Frontend, Backend, OpenAPI, audit, and migration gates.

## Not done

- No server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- `tests/test_contracts.py` remains oversized and should be split by API surface.
- `app/main.py` is now below 250 pure LOC, but it still mixes app construction, middleware registration, router registration, and a small CSRF policy seam.

## Follow-ups

- [[Backend Contract Test Split Follow-up]]: split `tests/test_contracts.py` into focused files before adding more contract cases.
- [[Backend App Factory Follow-up]]: consider an app factory only if future test isolation requires fresh app instances; avoid speculative restructuring while singleton app tests remain stable.

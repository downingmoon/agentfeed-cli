---
title: Backend OpenAPI Contract Module Split 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - refactor
  - api-contract
  - openapi
  - error-response
status: done
related:
  - "[[Common Middleware ErrorResponse OpenAPI Contract 2026-06-09]]"
  - "[[Unknown Route ErrorResponse Envelope 2026-06-09]]"
  - "[[Trusted Host ErrorResponse Envelope 2026-06-09]]"
---

# Backend OpenAPI Contract Module Split 2026-06-09

## Summary

`app/main.py` had accumulated application construction, middleware, health/readiness, request logging, and OpenAPI contract mutation in one large module. This pass split the OpenAPI `ErrorResponse` contract injection into a dedicated Backend module without changing API behavior.

## Changes

- Added `app/openapi_contract.py`.
- Moved common OpenAPI error response declarations out of `app/main.py`:
  - `400`
  - `403`
  - `413`
  - `429`
  - `500`
- Moved strict `ErrorResponse` schema injection into `install_agentfeed_openapi(...)`.
- Kept `app/main.py` responsible only for passing runtime constants into the contract installer.
- Reduced `app/main.py` pure LOC from `430` to `388`.
- New `app/openapi_contract.py` is `77` pure LOC.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'client_visible_error_responses or unknown_route_returns_error_envelope or trusted_host_middleware'
uv run --locked --group dev ruff check app/main.py app/openapi_contract.py tests/test_contracts.py
uv run --locked --group dev pytest

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash scripts/test-all.sh
```

Evidence:

- Pre-refactor safety test: `3 passed, 397 deselected`.
- Post-refactor targeted OpenAPI contract test: `1 passed, 399 deselected`.
- Backend full suite: `428 passed, 1 warning`.
- Dev OpenAPI gate: passed with `Strict client JSON error responses checked: 347`.
- Cross-repo `scripts/test-all.sh`: passed for Dev, CLI, Frontend, Backend, OpenAPI, audit, and migration gates.

## Not done

- No server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- `app/main.py` is still above the preferred 250 pure LOC ceiling.
- `tests/test_contracts.py` remains a very large contract test file and should be split by API surface later.

## Follow-ups

- [[Backend Main Module Split Follow-up]]: split request middleware, health/readiness, and app factory concerns from `app/main.py` in separate behavior-preserving passes.
- [[Backend Contract Test Split Follow-up]]: split `tests/test_contracts.py` into focused files for schemas, auth, worklogs, OpenAPI, security headers, and rate limits.

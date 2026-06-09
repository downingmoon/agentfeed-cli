---
title: Backend Request Boundary Module Split 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - refactor
  - request-boundary
  - security-headers
  - csrf
  - payload-limit
status: done
related:
  - "[[Backend OpenAPI Contract Module Split 2026-06-09]]"
  - "[[Trusted Host ErrorResponse Envelope 2026-06-09]]"
  - "[[Unknown Route ErrorResponse Envelope 2026-06-09]]"
---

# Backend Request Boundary Module Split 2026-06-09

## Summary

`app/main.py` still held request boundary helpers for request IDs, security headers, CORS-on-error, payload limits, and boundary response construction. This pass split those helpers into `app/request_boundary.py` while preserving the existing `app.main` import surface used by tests and existing code.

## Changes

- Added `app/request_boundary.py` for:
  - request ID constants and normalization
  - security header constants and application
  - handled-error CORS headers
  - ingest/mutation payload limits
  - payload-too-large `ErrorResponse` construction
  - CSRF-origin rejection `ErrorResponse` construction
  - URL-origin normalization
  - request body buffering with size limit
- Kept `allowed_csrf_origins` and `csrf_origin_allowed` in `app/main.py` because existing tests monkeypatch `app.main.allowed_csrf_origins` to verify fail-closed CSRF behavior.
- Preserved public imports such as `SECURITY_HEADERS`, `PRODUCTION_SECURITY_HEADERS`, `REQUEST_ID_HEADER`, `INGEST_PAYLOAD_MAX`, and `MUTATION_PAYLOAD_MAX` from `app.main`.
- Reduced `app/main.py` pure LOC from `388` after the OpenAPI split to `308`.
- New `app/request_boundary.py` is `104` pure LOC.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'request_id_header or security_headers or csrf_origin_allowed or payload_limit'
uv run --locked --group dev ruff check app/main.py app/request_boundary.py app/openapi_contract.py tests/test_contracts.py
uv run --locked --group dev pytest

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash scripts/test-all.sh
```

Evidence:

- Pre-refactor request-boundary safety tests: `7 passed, 393 deselected`.
- Post-refactor request-boundary safety tests: `7 passed, 393 deselected`.
- Backend full suite: `428 passed, 1 warning`.
- Dev OpenAPI gate: passed with `Strict client JSON error responses checked: 347`.
- Cross-repo `scripts/test-all.sh`: passed for Dev, CLI, Frontend, Backend, OpenAPI, audit, and migration gates.

## Not done

- No server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- `app/main.py` remains above the preferred 250 pure LOC ceiling at `308` pure LOC.
- `tests/test_contracts.py` remains oversized and should be split separately.

## Follow-ups

- [[Backend Main Module Split Follow-up]]: next behavior-preserving split should move app factory/router registration or health/readiness into focused modules.
- [[Backend Contract Test Split Follow-up]]: split `tests/test_contracts.py` by concern before it becomes harder to review targeted contract changes.

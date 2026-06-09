---
title: Common Middleware ErrorResponse OpenAPI Contract 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - api-contract
  - openapi
  - error-response
  - middleware
status: done
related:
  - "[[Cross Repo ErrorResponse Contract Gate 2026-06-09]]"
  - "[[CLI ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[Frontend ErrorResponse Envelope Strict Guard 2026-06-09]]"
---

# Common Middleware ErrorResponse OpenAPI Contract 2026-06-09

## Summary

Backend runtime middleware already emitted the strict `ErrorResponse` envelope for common client-visible failures, but the generated OpenAPI contract did not declare every middleware-origin error on affected operations.

This pass aligned the OpenAPI surface with runtime behavior so strict CLI and Frontend clients can rely on the same error envelope for route-local and middleware-origin failures.

## Changes

- Declared common OpenAPI `ErrorResponse` responses for every operation:
  - `429` rate limit
  - `500` internal server error
- Declared additional middleware-origin `ErrorResponse` responses where applicable:
  - `403` cookie-authenticated unsafe mutation rejected by CSRF origin checks
  - `413` payload too large on payload-limited methods and ingest routes
- Extended Backend contract tests to assert representative safe and unsafe operations expose the strict error schema.
- Re-ran the Dev OpenAPI gate; strict client JSON error responses are now checked across the expanded matrix.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev ruff check app/main.py tests/test_contracts.py
uv run --locked --group dev pytest tests/test_contracts.py -k 'client_visible_error_responses'
uv run --locked --group dev pytest

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash scripts/test-all.sh
```

Evidence:

- Backend targeted contract test: `1 passed, 398 deselected`.
- Backend full suite: `427 passed, 1 warning`.
- Dev OpenAPI gate: passed with `Strict client JSON error responses checked: 277`.
- Cross-repo `scripts/test-all.sh`: passed for Dev, CLI, Frontend, Backend, OpenAPI, audit, and migration gates.

## Not done

- No personal-server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- Live remote middleware error responses were not re-tested.

## Follow-ups

- [[Backend Module Split Follow-up]]: `app/main.py` and `tests/test_contracts.py` are still oversized existing files; split middleware/OpenAPI helpers and contract fixtures when refactor scope is explicitly opened.
- [[Trusted Host ErrorResponse Envelope 2026-06-09]]: completed follow-up; Host-header rejection now uses the strict `ErrorResponse` envelope and common `400` OpenAPI coverage.
- [[Auth Permission Error Documentation]]: add more precise per-route `401`/`403` descriptions later if API docs need user-facing clarity beyond the shared strict schema.

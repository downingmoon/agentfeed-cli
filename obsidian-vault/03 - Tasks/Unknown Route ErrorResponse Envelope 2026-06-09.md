---
title: Unknown Route ErrorResponse Envelope 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - api-contract
  - error-response
  - routing
status: done
related:
  - "[[Cross Repo ErrorResponse Contract Gate 2026-06-09]]"
  - "[[Trusted Host ErrorResponse Envelope 2026-06-09]]"
  - "[[Common Middleware ErrorResponse OpenAPI Contract 2026-06-09]]"
---

# Unknown Route ErrorResponse Envelope 2026-06-09

## Summary

Unknown routes were still returning FastAPI/Starlette's default JSON shape:

```json
{"detail":"Not Found"}
```

That shape is JSON, but it is not AgentFeed's strict `ErrorResponse` contract. Strict CLI and Frontend clients would treat this as a malformed backend error instead of a normal `404` API failure.

## Changes

- Registered the Backend HTTP exception handler against Starlette's `HTTPException` class, not only FastAPI's narrower exception import path.
- Added a runtime contract test for `/v1/does-not-exist`.
- Unknown API routes now return:

```json
{
  "error": {
    "code": "HTTP_404",
    "message": "Not Found",
    "details": {}
  }
}
```

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'unknown_route_returns_error_envelope'
uv run --locked --group dev ruff check app/main.py app/exceptions.py app/middleware/trusted_host.py tests/test_contracts.py
uv run --locked --group dev pytest

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash scripts/test-all.sh
```

Evidence:

- Red test failed before implementation with `{'detail': 'Not Found'}`.
- Targeted 404 route test passed after handler registration.
- Backend full suite: `428 passed, 1 warning`.
- Dev OpenAPI gate: passed with `Strict client JSON error responses checked: 347`.
- Cross-repo `scripts/test-all.sh`: passed for Dev, CLI, Frontend, Backend, OpenAPI, audit, and migration gates.

## Not done

- No server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- Live remote unknown-route responses were not manually tested.

## Follow-ups

- [[Backend Module Split Follow-up]]: `tests/test_contracts.py` continues to accumulate unrelated contract checks; split by API surface once refactor scope is opened.
- [[Client Error Display Audit]]: after backend error shapes are strict, verify CLI and Frontend render common `400`/`404`/`429`/`500` messages clearly without leaking implementation details.

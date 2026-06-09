---
title: Trusted Host ErrorResponse Envelope 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - api-contract
  - security
  - error-response
  - middleware
status: done
related:
  - "[[Common Middleware ErrorResponse OpenAPI Contract 2026-06-09]]"
  - "[[Cross Repo ErrorResponse Contract Gate 2026-06-09]]"
---

# Trusted Host ErrorResponse Envelope 2026-06-09

## Summary

`TrustedHostMiddleware` rejected unknown Host headers with Starlette's default plain-text `400 Invalid host header` response. That meant an edge security failure could bypass AgentFeed's strict `ErrorResponse` envelope even though CLI and Frontend now fail closed on malformed backend errors.

This pass replaced the default trusted-host middleware with an AgentFeed wrapper that preserves the same host allowlist behavior while returning JSON `ErrorResponse` for rejected hosts.

## Changes

- Added `AgentFeedTrustedHostMiddleware` in Backend.
- Preserved Starlette trusted-host semantics:
  - `*` allows all hosts.
  - wildcard domain syntax remains validated.
  - `www.` redirect behavior is preserved.
- Unknown Host now returns:

```json
{
  "error": {
    "code": "HOST_NOT_ALLOWED",
    "message": "Host header is not allowed.",
    "details": {}
  }
}
```

- Added common `400` OpenAPI `ErrorResponse` declarations across operations so this middleware-origin error is included in the strict contract matrix.
- Updated Backend contract tests to assert both runtime JSON shape and OpenAPI schema coverage.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev pytest tests/test_contracts.py -k 'trusted_host_middleware'
uv run --locked --group dev ruff check app/main.py app/middleware/trusted_host.py tests/test_contracts.py
uv run --locked --group dev pytest

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash scripts/test-all.sh
```

Evidence:

- Red test failed before implementation because rejected Host returned `text/plain; charset=utf-8`.
- Targeted TrustedHost + ErrorResponse tests: passed.
- Backend full suite: `427 passed, 1 warning`.
- Dev OpenAPI gate: passed with `Strict client JSON error responses checked: 347`.
- Cross-repo `scripts/test-all.sh`: passed for Dev, CLI, Frontend, Backend, OpenAPI, audit, and migration gates.

## Not done

- No personal-server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- Live remote Host-header rejection was not manually tested.

## Follow-ups

- [[Backend Module Split Follow-up]]: `app/main.py` and `tests/test_contracts.py` remain oversized pre-existing files; future refactor should split middleware/OpenAPI wiring and contract tests by concern.
- [[Auth Permission Error Documentation]]: keep improving per-route `401`/`403` docs if external API documentation needs clearer user-facing error descriptions.

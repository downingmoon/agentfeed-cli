---
title: Commercial Readiness Hardening - OAuth Invalid State Cookie Cleanup 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/oauth
status: done
aliases:
  - OAuth Invalid State Cookie Cleanup 2026-06-03
---

# Commercial Readiness Hardening - OAuth Invalid State Cookie Cleanup 2026-06-03

## Decision

GitHub OAuth callback invalid-state failures now return a fail-closed `400` JSON response that deletes the stale `agentfeed_oauth_state` cookie and applies no-store headers before any provider token exchange can run.

This prevents a browser from keeping a bad or expired OAuth state cookie after a failed callback attempt.

> [!success] Verification
> - RED: `test_github_callback_rejects_invalid_oauth_state_before_token_exchange` failed because the route raised before creating a cookie-clearing response.
> - GREEN: targeted OAuth callback/state tests passed.
> - Full backend gate: `./.venv/bin/ruff check .`; `./.venv/bin/pytest -q` → 360 passed, 1 existing Starlette/httpx warning.

## Scope

- Backend: `app/routers/auth.py`, `tests/test_contracts.py`
- No frontend/CLI code change required; this hardens the API callback response contract.

## Related

- [[Commercial Readiness Hardening - Ingest Privacy Scan Schema Bounds 2026-06-03]]
- [[Home]]

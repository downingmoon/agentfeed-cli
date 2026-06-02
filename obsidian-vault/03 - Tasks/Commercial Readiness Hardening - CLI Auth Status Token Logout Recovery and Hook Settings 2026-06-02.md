---
title: Commercial Readiness Hardening - CLI Auth Status Token Logout Recovery and Hook Settings 2026-06-02
aliases:
  - CLI Auth Status Token
  - Logout Recovery Isolation
  - Claude Hook Settings Validation
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: complete
created: 2026-06-02
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Runtime Configuration]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - CLI Auth Status Token Logout Recovery and Hook Settings 2026-06-02

> [!success] Outcome
> CLI browser auth status polling now requires a backend-issued lookup token, Frontend explicit sign-out no longer triggers generic session-expired recovery, and CLI Claude Code hook settings are validated plus written atomically.

## Backend — CLI auth session status token

- `cli_auth_sessions` now stores `status_token_hash` for browser-login status lookup.
- `POST /v1/auth/cli/sessions` puts `status_token` into the one-time `authorize_url`, but does not expose it as a top-level response field.
- `GET /v1/auth/cli/sessions/{session_id}` now requires `?status_token=...` and compares it against the stored hash.
- Added Alembic migration `021_cli_auth_session_status_token`.

> [!important]
> A leaked `session_id` alone can no longer probe device/status/expiry metadata for a pending CLI login flow.

## Frontend — CLI authorize and explicit logout recovery

- `/cli/authorize` captures both `session_id` and `status_token`, stores them in `sessionStorage` metadata with a 15-minute TTL, then strips the visible URL.
- Pending-session polling now calls `cliAuth.session(sessionId, statusToken)`.
- OAuth next sanitization explicitly strips both `session_id` and `status_token` from `/cli/authorize` redirects.
- `auth.logout()` suppresses the global auth-expiry event so a failed explicit sign-out does not show the session-expired banner.

## CLI — hook settings boundary

- Claude Code hook settings reads now reject malformed JSON and non-object roots with actionable recovery copy.
- Hook install/uninstall writes now use atomic JSON writes instead of direct overwrite.
- CLI browser-login authorize URL validation accepts the new `status_token` query while rejecting unexpected query parameters.

## 검증 증거

> [!example] Targeted verification
> - Backend: `uv run --locked --group dev ruff check app/routers/auth.py app/models/ingestion.py tests/test_contracts.py alembic/versions/021_cli_auth_session_status_token.py` — passed
> - Backend: `uv run --locked --group dev pytest tests/test_contracts.py -k "cli_auth_session_metadata or create_cli_auth_session_returns or cli_browser_auth_routes_exist or cli_auth_routes_have_response_models"` — 5 passed
> - Frontend: `npm run test:contracts && npm run lint` — passed
> - CLI: `npm test -- --run tests/api-hook.test.ts -t "browser login"` — 10 passed
> - CLI: `npm test -- --run tests/api-hook.test.ts -t "Claude Code hook installer"` — 6 passed
> - CLI: `npm run typecheck` — passed

## 남은 확인

> [!success]
> Full cross-repo gate passed after this note: `../agentfeed-dev/scripts/test-all.sh`, including CLI, Frontend, Backend, OpenAPI, and Alembic offline chain.

## 연결

- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Session Expiry and OAuth Audit Atomicity 2026-06-02]]
- [[Active Tasks]]

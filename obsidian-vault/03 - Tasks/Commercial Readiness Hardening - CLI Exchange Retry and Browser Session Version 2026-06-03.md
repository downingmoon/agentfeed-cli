---
title: Commercial Readiness Hardening - CLI Exchange Retry and Browser Session Version 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/auth
  - hardening
status: implemented
aliases:
  - CLI exchange retry and browser session version
---

# Commercial Readiness Hardening - CLI Exchange Retry and Browser Session Version 2026-06-03

## Outcome

- [[Auth & Credential Safety]]: advanced two more P1 auth hardening items.
- CLI browser login exchange now retries explicit transient failures during the approval wait loop: pending, HTTP 408, HTTP 429, HTTP 5xx, and network `TypeError`.
- CLI exchange schema/contract failures such as `API_RESPONSE_INVALID` remain terminal even when represented as 502, preventing malformed token responses from being hidden behind a timeout.
- Backend browser access tokens now carry a deterministic session version claim (`sv`) and are checked against `users.browser_session_version`.
- Backend logout increments `browser_session_version`, invalidating older browser JWTs independently of timestamp cutoff assumptions while retaining `session_revoked_at` as defense-in-depth.

> [!success] Verification
> - CLI RED: `npm test -- tests/api-hook.test.ts -t "transient browser login exchange|terminal browser login exchange"` failed because transient 503 exchange errors aborted immediately.
> - CLI GREEN: `npm test -- tests/api-hook.test.ts -t "transient browser login exchange|terminal browser login exchange|malformed browser exchange"`.
> - CLI full gate: `npm run prepack` → 23 test files, 386 tests passed.
> - Backend RED: `./.venv/bin/pytest tests/test_contracts.py -k "browser_session_version or logout_revokes_existing_browser_session_tokens" -q` failed because version mismatches were accepted and logout did not bump the version.
> - Backend GREEN: `./.venv/bin/pytest tests/test_contracts.py -k "browser_session_version or logout_revokes_existing_browser_session_tokens or current_user_optional_uses_valid_bearer" -q`.
> - Backend full gate: `./.venv/bin/ruff check . && ./.venv/bin/pytest -q` → 362 passed, 1 existing Starlette/httpx warning.

## Changed Files

### CLI

- `src/auth/browser-login.ts`
  - Added default retry classifier for browser auth exchange.
  - Retries pending/transient errors; excludes `API_RESPONSE_INVALID` terminal response contract failures.
- `tests/api-hook.test.ts`
  - Added transient exchange retry coverage.
  - Added terminal verifier failure no-retry coverage.
  - Existing malformed exchange tests proved schema failures remain terminal.

### Backend

- `app/models/user.py`
  - Added `browser_session_version` with default/server default `0`.
- `alembic/versions/027_browser_session_version.py`
  - Adds the `users.browser_session_version` column.
- `app/routers/auth.py`
  - Browser OAuth login issues JWT with `sv` claim.
  - Logout increments `browser_session_version` and includes it in audit metadata.
- `app/dependencies.py`
  - Validates token `sv` against `user.browser_session_version` while keeping `session_revoked_at` cutoff.
  - Allows legacy missing/zero version tokens only while user version is still `0`.
- `tests/test_contracts.py`
  - Added session version mismatch rejection test.
  - Strengthened logout revocation test to assert deterministic version bump.

## Remaining Blocker

> [!warning]
> Hosted production readiness remains externally blocked:
> - `api.agentfeed.dev` DNS is unresolved in strict frontend hosted checks.
> - `https://agentfeed.dev/` root redirects to `/login` instead of passing public root readiness.

## Next Candidates

- Frontend: component-level `/cli/authorize` tests beyond source contracts.
- Backend: ingestion token context row-lock/atomicity under rotate/revoke races.
- Dev: hosted deployment/DNS runbook automation once deployment authority is available.


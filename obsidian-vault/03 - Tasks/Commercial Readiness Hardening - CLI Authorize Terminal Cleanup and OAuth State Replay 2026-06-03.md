---
title: Commercial Readiness Hardening - CLI Authorize Terminal Cleanup and OAuth State Replay 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/auth
  - hardening
status: implemented
aliases:
  - CLI authorize terminal cleanup and OAuth state replay
---

# Commercial Readiness Hardening - CLI Authorize Terminal Cleanup and OAuth State Replay 2026-06-03

## Outcome

- [[Auth & Credential Safety]]: advanced two P1 auth hardening items.
- Frontend `/cli/authorize` no longer treats arbitrary unknown/programming errors as transient retryable failures.
- Frontend terminal CLI authorize errors now clear stored one-time `session_id`/`status_token` before surfacing the error, preventing stale session reuse loops.
- Backend GitHub OAuth callback state is now single-consume: a signed state nonce is persisted before GitHub token exchange, and replayed callbacks are rejected before token exchange.

> [!success] Verification
> - Frontend RED: `npm run test:contracts -- --run src/lib/page-source-contract.test.ts` failed on the new terminal cleanup contract before implementation.
> - Frontend GREEN: `npm run test:contracts -- --run src/lib/page-source-contract.test.ts && npm run lint`.
> - Frontend full code gate: `node scripts/ci-workflow.contract.test.mjs && npm run test:contracts && npm audit --omit=dev --audit-level=moderate && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run check:api-compatibility:mock && NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`.
> - Backend RED: `./.venv/bin/pytest tests/test_contracts.py -k "github_callback_consumes_oauth_state_once" -q` failed because replayed state reached token exchange and returned redirect success.
> - Backend GREEN: `./.venv/bin/pytest tests/test_contracts.py -k "github_callback or github_oauth_state or github_login_sets_cookie_bound_oauth_state" -q`.
> - Backend full gate: `./.venv/bin/ruff check . && ./.venv/bin/pytest -q` → 361 passed, 1 existing Starlette/httpx warning.

## Changed Files

### Frontend

- `src/components/pages/CliAuthorizePage.tsx`
  - `isTransientCliAuthorizeError()` now retries only explicit transient classes: `TypeError`, HTTP 408, 429, and 5xx.
  - Added `clearTerminalCliSession()` and called it on terminal load/approval failures.
  - Clears stored one-time session metadata on unexpected non-pending statuses.
- `src/lib/page-source-contract.test.ts`
  - Locks terminal cleanup and transient classification policy.

### Backend

- `app/models/ingestion.py`
  - Added `OAuthStateConsumption` model keyed by state nonce.
- `app/models/__init__.py`
  - Exports model for Alembic metadata discovery.
- `alembic/versions/026_oauth_state_consumptions.py`
  - Creates `oauth_state_consumptions` with nonce primary key and expiry index.
- `app/routers/auth.py`
  - Split `_decode_next_state_payload()` from legacy `_decode_next_state()`.
  - Consumes state nonce with `flush()` + `commit()` before GitHub token exchange.
  - Duplicate nonce raises `OAUTH_STATE_INVALID` and clears OAuth state cookie.
- `tests/test_contracts.py`
  - Adds replay regression test proving second callback with the same state does not call token exchange.
  - Updates callback success tests for the intentional two-commit sequence: state consume, then login/audit.

## Remaining Blocker

> [!warning]
> Hosted production readiness remains externally blocked:
> - `api.agentfeed.dev` DNS is still unresolved in strict frontend hosted checks.
> - `https://agentfeed.dev/` root still redirects to `/login` for strict hosted readiness.

## Next Candidates

- Backend: browser access token identity/session binding beyond timestamp revocation.
- CLI: browser auth exchange retry policy for explicit transient API/network failures only.
- Frontend: richer component-level tests for `/cli/authorize` sessionStorage cleanup beyond source contracts.


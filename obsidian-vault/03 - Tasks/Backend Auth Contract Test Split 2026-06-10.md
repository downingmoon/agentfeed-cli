---
title: Backend Auth Contract Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - auth
  - oauth
  - cli-auth
  - refactor
status: done
related:
  - "[[Backend Request Boundary Contract Test Split 2026-06-10]]"
  - "[[Backend System Contract Test Split 2026-06-09]]"
  - "[[Backend Error Contract Test Split 2026-06-09]]"
---

# Backend Auth Contract Test Split 2026-06-10

> [!success] Result
> OAuth state, CLI auth response schema, auth-me frontend user contract, and CLI route-presence tests now live in a focused backend auth contract test file.

## Scope

This pass intentionally moved the auth **API contract surface**, not the larger auth business-flow tests. The remaining CLI browser auth lifecycle tests still rely on heavier fake DB/session fixtures and should move in a separate, targeted pass.

## What changed

- Added `tests/test_auth_contracts.py`.
- Moved 8 test functions covering 23 pytest cases:
  - `test_github_oauth_state_requires_cookie_bound_signature`
  - `test_github_oauth_next_state_strips_untrusted_query_and_hash_values`
  - `test_github_oauth_next_state_rejects_unsafe_or_unknown_paths`
  - `test_cli_auth_session_status_response_requires_known_status`
  - `test_cli_auth_approve_response_requires_true_ok_and_approved_status`
  - `test_auth_me_includes_location_for_frontend_user_contract`
  - `test_cli_browser_auth_routes_exist_for_cli_login_flow`
  - `test_ingestion_status_route_exists_for_cli_doctor_token_check`
- Size movement:
  - `tests/test_contracts.py`: 9,259 → 9,125 pure LOC.
  - `tests/test_auth_contracts.py`: 141 pure LOC.

## Why this improves enterprise readiness

- Auth and CLI login contract behavior now has a small named test target.
- OAuth state sanitization and CLI auth response enums remain explicitly verified without being buried in the monolithic suite.
- The split preserves behavior and does not introduce any new feature or infrastructure change.

## Verification evidence

- Pre-split target behavior lock:
  - `uv run --locked --group dev pytest tests/test_contracts.py -k 'github_oauth_state_requires_cookie_bound_signature or github_oauth_next_state_strips_untrusted_query_and_hash_values or github_oauth_next_state_rejects_unsafe_or_unknown_paths or cli_auth_session_status_response_requires_known_status or cli_auth_approve_response_requires_true_ok_and_approved_status or auth_me_includes_location_for_frontend_user_contract or cli_browser_auth_routes_exist_for_cli_login_flow or ingestion_status_route_exists_for_cli_doctor_token_check'`
  - Result: 23 selected cases passed.
- Split-file check:
  - `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_auth_contracts.py`
  - Result: passed.
  - `uv run --locked --group dev pytest tests/test_auth_contracts.py`
  - Result: 23 passed.
- Backend full suite:
  - `uv run --locked --group dev pytest`
  - Result: 428 passed, 1 warning.
- Cross-repo contract gate:
  - `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs`
  - Result: passed; 75 operations, 70 client contracts, 347 strict client JSON error responses.
- Cross-repo full verification:
  - `cd ../agentfeed-dev && bash scripts/test-all.sh`
  - Result: passed, including CLI 591 tests, CLI release preflight, frontend CI/build, backend 428 tests, and Alembic offline migration chain.

## Not done

- No server deployment was performed.
- No live remote API was exercised.
- Auth business-flow tests remain in `tests/test_contracts.py` and need a separate split.

## Follow-ups

- [ ] Split CLI browser auth lifecycle tests that use fake DB sessions.
- [ ] Split provider token encryption and provider identity persistence tests.
- [ ] Split ingestion/worklog source identity contract tests.
- [ ] Split worklog card/review/public response contract tests.

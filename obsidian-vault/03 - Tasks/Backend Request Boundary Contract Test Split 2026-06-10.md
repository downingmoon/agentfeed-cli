---
title: Backend Request Boundary Contract Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - request-boundary
  - rate-limit
  - middleware
  - refactor
status: done
related:
  - "[[Backend System Contract Test Split 2026-06-09]]"
  - "[[Backend Error Contract Test Split 2026-06-09]]"
  - "[[Backend System Routes Module Split 2026-06-09]]"
---

# Backend Request Boundary Contract Test Split 2026-06-10

> [!success] Result
> Request-boundary and rate-limit middleware contract tests were moved out of the monolithic backend contract suite into two focused files that stay under the 250 pure LOC ceiling.

## What changed

- Added `tests/test_request_boundary_contracts.py` for request ID, security header, structured logging, and unhandled-error response contracts.
- Added `tests/test_rate_limit_boundary_contracts.py` for degraded/fail-closed rate-limit middleware boundary behavior.
- Moved 12 test functions covering 18 pytest cases.
- Size movement:
  - `tests/test_contracts.py`: 9,523 → 9,259 pure LOC.
  - `tests/test_request_boundary_contracts.py`: 90 pure LOC.
  - `tests/test_rate_limit_boundary_contracts.py`: 176 pure LOC.

## Important decision

The first split attempt placed all 18 cases into one `test_request_boundary_contracts.py` file, but that produced a 266 pure LOC file. That violates the current code-quality rule, so the pass was corrected before commit by separating rate-limit boundary behavior into its own file.

## Why this improves enterprise readiness

- Middleware behavior now has smaller named test targets, making request boundary regressions easier to isolate.
- The split keeps behavior unchanged while reducing review risk in the oversized contract suite.
- Request ID, security header, logging, internal error envelope, degraded rate-limit, and fail-closed behavior remain covered by full cross-repo verification.

## Verification evidence

- Pre-split target behavior lock:
  - `uv run --locked --group dev pytest tests/test_contracts.py -k 'request_id_header_is_generated_and_valid_input_is_echoed or request_id_header_replaces_unsafe_input or security_headers_are_present_on_health_and_auth_endpoints or production_security_headers_include_hsts_and_api_csp or request_logging_is_structured_and_omits_query_string or request_id_header_is_returned_on_unhandled_error or rate_limit_store_unavailable_response_is_degraded_and_request_id or rate_limit_store_failure_through_middleware_fails_closed_and_logs or rate_limit_store_failure_allows_metadata_with_degraded_fallback_header or rate_limit_store_failure_keeps_non_metadata_routes_fail_closed or rate_limit_store_failure_allows_health_with_degraded_fallback_header or rate_limit_store_failure_allows_readiness_to_report_database_state'`
  - Result: 18 selected cases passed, 1 warning.
- Split-file check:
  - `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_request_boundary_contracts.py tests/test_rate_limit_boundary_contracts.py`
  - Result: passed.
  - `uv run --locked --group dev pytest tests/test_request_boundary_contracts.py tests/test_rate_limit_boundary_contracts.py`
  - Result: 18 passed, 1 warning.
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
- `tests/test_contracts.py` is still oversized and should keep shrinking by API surface.

## Follow-ups

- [ ] Split auth and CLI browser auth contract tests.
- [ ] Split ingestion/worklog source identity contract tests.
- [ ] Split worklog card/review/public response contract tests.
- [ ] Split profile/settings/search/explore/public discovery contract tests.

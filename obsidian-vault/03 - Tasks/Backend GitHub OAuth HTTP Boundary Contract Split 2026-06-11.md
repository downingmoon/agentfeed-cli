---
title: Backend GitHub OAuth HTTP Boundary Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - github
  - oauth
  - http-boundary
  - auth
  - maintainability
  - refactor
status: done
related:
  - "[[Backend GitHub OAuth Contract Test Split 2026-06-10]]"
  - "[[Backend Worklog Card Frontend Contract Split 2026-06-11]]"
  - "[[Backend Audit Contract Split 2026-06-10]]"
---
# Backend GitHub OAuth HTTP Boundary Contract Split 2026-06-11

> [!success] Result
> GitHub OAuth upstream response/failure boundary contracts now live in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_github_oauth_http_boundary_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_github_access_token_exchange_rejects_missing_access_token`
  - `test_github_user_fetch_rejects_non_object_payload`
  - `test_github_access_token_exchange_translates_httpx_failure_to_503`
  - `test_github_user_fetch_translates_httpx_failure_to_503`
- Preserved authentication-boundary guarantees:
  - malformed token exchange responses become typed `GITHUB_OAUTH_RESPONSE_INVALID` errors,
  - malformed GitHub user payloads become typed `GITHUB_OAUTH_RESPONSE_INVALID` errors,
  - upstream timeout/connect failures become typed `GITHUB_OAUTH_UNAVAILABLE` 503 errors,
  - OAuth client calls keep the configured `GITHUB_OAUTH_TIMEOUT`.
- Kept existing `tests/test_github_oauth_contracts.py` untouched because it is already `242` pure LOC and should not absorb more cases.
- Skipped GitHub CI workflow tests because active goal rule says server/infra/CICD work is currently on hold.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `311` pure LOC after split.
  - `tests/test_github_oauth_http_boundary_contracts.py`: `94` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_github_access_token_exchange_rejects_missing_access_token tests/test_contracts.py::test_github_user_fetch_rejects_non_object_payload tests/test_contracts.py::test_github_access_token_exchange_translates_httpx_failure_to_503 tests/test_contracts.py::test_github_user_fetch_translates_httpx_failure_to_503 -q` → `4 passed in 0.51s`.
- Focused split file: `uv run pytest tests/test_github_oauth_http_boundary_contracts.py -q` → `4 passed in 0.58s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_current_streak_counts_consecutive_public_worklog_days_with_yesterday_grace -q` → `1 passed in 0.46s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_github_oauth_http_boundary_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 3.54s`.
- Escape-hatch scan on changed files found no `type: ignore`, `pyright: ignore`, broad `except Exception`, silent `except`, `cast(`, or `Any` additions.
- LSP diagnostics: unavailable because `basedpyright-langserver` is not installed in the current environment.

## Not done

- No backend runtime behavior changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.
- CI workflow contract tests remain in `tests/test_contracts.py` because CI/infra work is explicitly paused.

## Follow-ups

- Continue reducing `tests/test_contracts.py` by non-infra cohesive surfaces.
- Next likely catch-all candidates: user activity/streak contracts, user-generated text limits, and worklog create/default visibility contracts.

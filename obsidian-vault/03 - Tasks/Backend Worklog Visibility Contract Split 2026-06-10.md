---
title: Backend Worklog Visibility Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - visibility
  - access-control
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Worklog Card Builder Contract Split 2026-06-10]]"
  - "[[Backend Worklog Mutation Contract Split 2026-06-10]]"
  - "[[Backend Worklog Public Detail Contract Split 2026-06-10]]"
---
# Backend Worklog Visibility Contract Split 2026-06-10

> [!success] Result
> Worklog direct-link visibility contracts now live in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_worklog_visibility_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_non_owner_cannot_view_unpublished_public_visibility_worklog`
  - `test_non_owner_can_view_published_unlisted_worklog_by_direct_link`
- Preserved access-control guarantees:
  - anonymous/non-owner users cannot view unpublished public-visibility worklogs,
  - the author can still view their unpublished worklog,
  - published unlisted worklogs remain accessible by direct link.
- Skipped GitHub CI workflow tests because active goal rule says server/infra/CICD work is currently on hold.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `859` pure LOC after split.
  - `tests/test_worklog_visibility_contracts.py`: `30` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_non_owner_cannot_view_unpublished_public_visibility_worklog tests/test_contracts.py::test_non_owner_can_view_published_unlisted_worklog_by_direct_link -q` → `2 passed in 0.65s`.
- Focused split file: `uv run pytest tests/test_worklog_visibility_contracts.py -q` → `2 passed in 0.38s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_worklog_metrics_preserve_agent_session_activity_fields -q` → `1 passed in 0.33s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_worklog_visibility_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 1.84s`.
- Escape-hatch scan on changed files found no `type: ignore`, `pyright: ignore`, broad `except Exception`, silent `except`, `cast(`, or `Any` additions.
- LSP diagnostics: unavailable because `basedpyright-langserver` is not installed in the current environment.

## Not done

- No backend runtime behavior changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.
- CI workflow contract tests remain in `tests/test_contracts.py` because CI/infra work is explicitly paused.

## Follow-ups

- Continue reducing `tests/test_contracts.py` by non-infra cohesive surfaces.
- Next likely candidates: worklog metrics/frontend-card field contracts, ingestion schema/source contracts, and user-generated text limits.

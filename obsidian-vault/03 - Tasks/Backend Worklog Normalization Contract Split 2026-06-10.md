---
title: Backend Worklog Normalization Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - normalization
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Worklog Public Detail Privacy Test Split 2026-06-10]]"
  - "[[Worklog Timeline Status Enum Guard 2026-06-08]]"
  - "[[AgentFeed Current Product Brief]]"
---
# Backend Worklog Normalization Contract Split 2026-06-10

> [!success] Result
> Worklog outcome/timeline normalization contracts now live in a focused backend test file, keeping malformed legacy rows fail-closed without burying the ownership in the catch-all contract suite.

## What changed

- Added `tests/test_worklog_normalization_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_normalize_outcome_supports_legacy_agent_shape_without_500`
  - `test_worklog_normalizers_report_dropped_row_counts`
  - `test_normalize_timeline_supports_legacy_rows_without_500`
  - `test_worklog_timeline_status_requires_known_value`
  - `test_normalize_timeline_drops_unknown_status_without_500`
- Removed the now-unused `logging` import and direct normalization service imports from the catch-all file.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `1,085` pure LOC after split.
  - `tests/test_worklog_normalization_contracts.py`: `117` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_normalize_outcome_supports_legacy_agent_shape_without_500 tests/test_contracts.py::test_worklog_normalizers_report_dropped_row_counts tests/test_contracts.py::test_normalize_timeline_supports_legacy_rows_without_500 tests/test_contracts.py::test_worklog_timeline_status_requires_known_value tests/test_contracts.py::test_normalize_timeline_drops_unknown_status_without_500 -q` → `5 passed in 0.40s`.
- Focused split file: `uv run pytest tests/test_worklog_normalization_contracts.py -q` → `5 passed in 0.33s`.
- Remaining adjacent catch-all contract: `uv run pytest tests/test_contracts.py::test_integration_status_response_requires_known_status -q` → `1 passed in 0.39s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_worklog_normalization_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 1.80s`.

## Not done

- No backend runtime code changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.

## Follow-ups

- Continue reducing `tests/test_contracts.py` by cohesive backend surfaces until the catch-all file is no longer the default landing zone for new contracts.
- Next likely split candidates: worklog card hydration/batching, worklog public source/detail contracts, and search/tag privacy filters if any still remain in the catch-all file.

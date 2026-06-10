---
title: Backend Worklog Schema Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - schema
  - metrics
  - multi-agent
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Worklog Visibility Contract Split 2026-06-10]]"
  - "[[Backend Worklog Normalization Contract Split 2026-06-10]]"
  - "[[Backend Ingestion CLI Contract Split 2026-06-10]]"
---
# Backend Worklog Schema Contract Split 2026-06-10

> [!success] Result
> Worklog metrics and source-agent schema contracts now live in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_worklog_schema_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_worklog_metrics_preserve_agent_session_activity_fields`
  - `test_worklog_source_and_review_source_reject_unknown_agents`
- Preserved CLI/API/Frontend contract guarantees:
  - multi-agent activity fields such as `tool_calls`, `commands_run`, `skills_used`, subagent counts, `models_used`, and per-agent metrics are retained,
  - raw/private metric extras fail closed instead of being silently ignored,
  - unknown worklog/review source agents are rejected before entering public response contracts.
- Skipped GitHub CI workflow tests because active goal rule says server/infra/CICD work is currently on hold.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `777` pure LOC after split.
  - `tests/test_worklog_schema_contracts.py`: `84` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_worklog_metrics_preserve_agent_session_activity_fields tests/test_contracts.py::test_worklog_source_and_review_source_reject_unknown_agents -q` → `2 passed in 0.50s`.
- Focused split file: `uv run pytest tests/test_worklog_schema_contracts.py -q` → `2 passed in 0.08s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_ingest_worklog_payload_preserves_model_for_database_column -q` → `1 passed in 0.44s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_worklog_schema_contracts.py` → `All checks passed!`.
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
- Next likely candidates: ingest payload schema/preview contracts, worklog card frontend field contracts, and user-generated text limits.

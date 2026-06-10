---
title: Backend Ingestion Payload Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - ingestion
  - cli-contract
  - preview
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Worklog Schema Contract Split 2026-06-10]]"
  - "[[Backend Ingestion CLI Contract Split 2026-06-10]]"
  - "[[CLI API JSON Boundary Guard 2026-06-10]]"
---
# Backend Ingestion Payload Contract Split 2026-06-10

> [!success] Result
> CLI ingestion payload and preview response contracts now live in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_ingestion_payload_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_ingest_worklog_payload_preserves_model_for_database_column`
  - `test_ingest_schema_rejects_unknown_cli_agent_and_category_values`
  - `test_ingest_worklog_payload_preserves_user_note_separately_from_summary`
  - `test_ingest_preview_response_contract_is_typed`
  - `test_preview_metrics_row_preserves_unknown_metrics`
- Preserved CLI/API/Frontend contract guarantees:
  - `worklog.model` is retained for the database-backed model field,
  - unknown CLI agents and categories fail closed before reaching frontend render/filter state,
  - user-authored notes remain separate from generated summaries,
  - ingest preview responses keep a typed shape with required `metrics_row`,
  - unknown metric values render as unknown markers instead of fabricated zeroes.
- Avoided merging these into `tests/test_ingestion_cli_contracts.py` because that file already owns CLI response/status surfaces and would move closer to the 250 pure-LOC ceiling.
- Skipped GitHub CI workflow tests because active goal rule says server/infra/CICD work is currently on hold.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `620` pure LOC after split.
  - `tests/test_ingestion_payload_contracts.py`: `163` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_ingest_worklog_payload_preserves_model_for_database_column tests/test_contracts.py::test_ingest_schema_rejects_unknown_cli_agent_and_category_values tests/test_contracts.py::test_ingest_worklog_payload_preserves_user_note_separately_from_summary tests/test_contracts.py::test_ingest_preview_response_contract_is_typed tests/test_contracts.py::test_preview_metrics_row_preserves_unknown_metrics -q` → `5 passed in 0.44s`.
- Focused split file: `uv run pytest tests/test_ingestion_payload_contracts.py -q` → `5 passed in 0.42s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_worklog_card_includes_frontend_contract_fields -q` → `1 passed in 0.34s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_ingestion_payload_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 1.79s`.
- Escape-hatch scan on changed files found no `type: ignore`, `pyright: ignore`, broad `except Exception`, silent `except`, `cast(`, or `Any` additions.
- LSP diagnostics: unavailable because `basedpyright-langserver` is not installed in the current environment.

## Not done

- No backend runtime behavior changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.
- CI workflow contract tests remain in `tests/test_contracts.py` because CI/infra work is explicitly paused.

## Follow-ups

- Continue reducing `tests/test_contracts.py` by non-infra cohesive surfaces.
- Next likely candidates: worklog card frontend field contracts, GitHub OAuth HTTP boundary tests, and user-generated text limits.

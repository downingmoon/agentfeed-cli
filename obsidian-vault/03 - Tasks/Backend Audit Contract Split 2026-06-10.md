---
title: Backend Audit Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - audit
  - security
  - observability
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Request Boundary Contract Test Split 2026-06-10]]"
  - "[[Backend Social Report Contract Split 2026-06-10]]"
  - "[[Backend Worklog Card Builder Contract Split 2026-06-10]]"
---
# Backend Audit Contract Split 2026-06-10

> [!success] Result
> Audit persistence, redaction, request-id propagation, and auth-audit ordering contracts now live in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_audit_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_audit_event_model_is_durable_and_queryable`
  - `test_record_audit_event_redacts_sensitive_metadata_without_committing`
  - `test_audit_request_id_reads_middleware_state_only_when_valid`
  - `test_audit_request_id_index_migration_declares_incident_lookup_index`
  - `test_github_login_user_upsert_does_not_commit_before_auth_audit`
  - `test_router_audit_event_calls_include_request_id_context`
- Preserved enterprise-critical guarantees:
  - audit metadata redacts token-like secrets,
  - audit writes do not commit independently,
  - request IDs are persisted and indexed for incident lookup,
  - router audit calls keep request-id context,
  - GitHub auth user upsert does not commit before audit capture.
- Skipped GitHub CI workflow tests as the next slice because active goal rule says server/infra/CICD work is currently on hold.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `880` pure LOC after split.
  - `tests/test_audit_contracts.py`: `83` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_audit_event_model_is_durable_and_queryable tests/test_contracts.py::test_record_audit_event_redacts_sensitive_metadata_without_committing tests/test_contracts.py::test_audit_request_id_reads_middleware_state_only_when_valid tests/test_contracts.py::test_audit_request_id_index_migration_declares_incident_lookup_index tests/test_contracts.py::test_github_login_user_upsert_does_not_commit_before_auth_audit tests/test_contracts.py::test_router_audit_event_calls_include_request_id_context -q` → `6 passed in 0.44s`.
- Focused split file: `uv run pytest tests/test_audit_contracts.py -q` → `6 passed in 0.64s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_non_owner_cannot_view_unpublished_public_visibility_worklog -q` → `1 passed in 0.41s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_audit_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 3.29s`.
- LSP diagnostics: unavailable because `basedpyright-langserver` is not installed in the current environment.

## Not done

- No backend runtime behavior changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.
- CI workflow contract tests remain in `tests/test_contracts.py` because CI/infra work is explicitly paused.

## Follow-ups

- Continue reducing `tests/test_contracts.py` by non-infra cohesive surfaces.
- Next likely candidates: worklog visibility/public card contracts, ingestion schema/source contracts, and user-generated field limits.

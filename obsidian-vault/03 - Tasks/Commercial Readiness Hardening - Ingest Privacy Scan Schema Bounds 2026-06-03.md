---
title: Commercial Readiness Hardening - Ingest Privacy Scan Schema Bounds 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/privacy
status: done
aliases:
  - Ingest Privacy Scan Schema Bounds 2026-06-03
---

# Commercial Readiness Hardening - Ingest Privacy Scan Schema Bounds 2026-06-03

## Decision

Backend ingest now rejects malformed or oversized `privacy_scan` payloads before database writes. The schema is aligned to the existing storage/comment contract:

- `status`: `safe | warning | danger`
- `type`: known privacy finding categories shared with CLI, including `database_url`
- `severity`: existing backend storage/reporting set `info | low | medium | high | critical | unknown`
- `resolution`: `ignored | redacted | removed`
- `field`: capped at 100 characters to match `privacy_findings.field`
- `findings`: capped at 50 items to prevent unbounded DB row creation and JSON payload growth

> [!success] Verification
> - RED: new contract test failed before schema hardening because invalid privacy scan values were accepted.
> - GREEN: `./.venv/bin/pytest -q tests/test_contracts.py::test_ingest_privacy_scan_schema_matches_storage_and_contract_bounds`
> - Regression: `./.venv/bin/pytest -q tests/test_contracts.py::test_ingested_preresolved_critical_finding_still_blocks_until_review_resolution tests/test_contracts.py::test_publish_reports_only_blocking_privacy_findings tests/test_contracts.py::test_public_worklog_detail_sanitizes_source_and_privacy_scan_findings tests/test_contracts.py::test_worklog_review_runs_server_privacy_scan_and_persists_blocking_findings tests/test_contracts.py::test_worklog_action_schemas_reject_invalid_enums_with_pydantic_validation tests/test_contracts.py::test_ingest_privacy_scan_schema_matches_storage_and_contract_bounds`
> - Full backend gate: `./.venv/bin/ruff check .`; `./.venv/bin/pytest -q` → 360 passed, 1 existing Starlette/httpx warning.

## Scope

- Backend: `app/schemas/worklog.py`, `tests/test_contracts.py`
- CLI/Frontend: no code change required in this pass; CLI already validates the narrower generated privacy scan contract locally.

## Follow-ups

- [[Home]] should continue tracking the external hosted blocker: `api.agentfeed.dev` DNS is unresolved and `https://agentfeed.dev/` root redirects to `/login`, so hosted readiness is not yet commercially green.

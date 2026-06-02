---
title: Commercial Readiness Hardening - Backend Session Window Identity 2026-06-03
aliases:
  - Backend Session Window Source Identity
  - Ingest Session Dedupe Guard
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/ingestion
  - agentfeed/idempotency
status: done
created: 2026-06-03
updated: 2026-06-03
---

# Backend Session Window Identity

> [!success] Outcome
> Backend ingest idempotency now rejects bare `session_id` as a source identity and only uses session-based fallback when it is scoped by `collection_window`.

## Risk

> [!bug] P2 data integrity
> A bare `session_id` can represent many worklog collection windows inside one agent session. Hashing only `session_id` as `source_identity_hash` can make distinct worklogs reuse the first inserted worklog, silently dropping later work.

## Changes

- `app/schemas/ingestion.py`
  - `IngestSource` now accepts identity from:
    - `collection_fingerprint`
    - `local_draft_id`
    - `session_id + collection_window.since/until`
  - `session_id` alone is rejected because it is not a stable worklog identity.
- `app/routers/ingest.py`
  - Source identity fallback is now `session_window = session_id:since:until`, not bare `session_id`.
- Backend tests updated to use `local_draft_id` for generic ingest payload construction and to lock the new session-window fallback behavior.

## Verification

- `.venv/bin/pytest tests/test_contracts.py tests/test_ingestion_quota.py -q`
- 후속 전체 gate: `.venv/bin/pytest tests -q`, `.venv/bin/ruff check app tests`, `agentfeed-dev/scripts/test-all.sh`

## Related

- [[Commercial Readiness Hardening - Runtime Contract and Ingest Identity 2026-06-03]]
- [[Commercial Readiness Hardening - CLI Draft Identity Guard 2026-06-03]]
- [[Active Tasks]]

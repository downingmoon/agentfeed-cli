---
title: Commercial Readiness Hardening - Ingestion Quota Retention
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - quota/retention
  - operations/scale
status: verified
aliases:
  - Ingestion Quota Retention 2026-06-03
---

# Commercial Readiness Hardening - Ingestion Quota Retention

Related: [[Commercial Readiness Hardening - Ingestion Context Row Locks 2026-06-03]] · [[Home]]

## Outcome

Backend ingestion quota events now have an operator-configurable retention window.

- Added `INGEST_QUOTA_EVENT_RETENTION_DAYS` with default `8` days.
- Settings validation requires retention days to be positive.
- Ingestion quota enforcement locks the user row, prunes that user's old quota events, then performs daily count/byte quota checks.
- `.env.example` documents the new setting.

> [!success] Commercial-readiness impact
> Quota checks remain durable for the active UTC daily window while stale per-user quota rows are pruned before they can accumulate indefinitely.

## TDD Evidence

### RED

```bash
./.venv/bin/pytest tests/test_ingestion_quota.py -q
```

Result: failed because `INGEST_QUOTA_EVENT_RETENTION_DAYS` did not exist and quota enforcement did not delete old rows before counting.

### GREEN - targeted

```bash
./.venv/bin/pytest tests/test_ingestion_quota.py -q
```

Result: `6 passed`.

### Regression fix after full gate

```bash
./.venv/bin/pytest tests/test_contracts.py -k "ingested_preresolved_critical_finding_still_blocks_until_review_resolution" -q
```

Result: `1 passed, 337 deselected`; updated an existing FakeDbSession fixture for the new quota-pruning execute call.

### Full backend gate

```bash
./.venv/bin/ruff check . && ./.venv/bin/pytest -q
```

Result: `All checks passed!`, `363 passed, 1 warning`.

### Alembic chain smoke

```bash
./.venv/bin/alembic upgrade head --sql >/tmp/agentfeed-backend-alembic.sql
```

Result: offline migration chain generated successfully through `027_browser_session_version`.

## Parallel DPAPI Finding

A read-only CLI scan found Windows DPAPI has mocked cross-platform coverage, but no native Windows CI smoke yet.

Recommended next step:

1. Add a Windows-native keychain/DPAPI smoke branch in `AgentFeed-CLI/tests/config.test.ts` or a new focused test file.
2. Add a `windows-latest` GitHub Actions job gated with `AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS=1`.
3. Update README credential storage docs to explicitly mention Windows DPAPI.

## Remaining External Blocker

> [!warning] Hosted strict readiness
> Production hosted readiness is still externally blocked by `api.agentfeed.dev` DNS resolution and `https://agentfeed.dev/` root redirecting to `/login`.

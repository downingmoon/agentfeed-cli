---
title: Metric Evidence Collection Limit Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - backend
  - frontend
  - contract
  - enterprise-hardening
status: done
related:
  - "[[Ingestion Evidence Contract Guard 2026-06-11]]"
  - "[[CLI Validation Primitive Split 2026-06-11]]"
---

# Metric Evidence Collection Limit Contract 2026-06-11

> [!summary]
> Aligned metric evidence collection-size limits across CLI, Backend, and Frontend. `models_used`, `agent_metrics`, `agent_modes`, and `collection_sources` now share the same 20-item contract and fail closed before oversized evidence reaches review UI.

## Why

The cross-repo check found an inconsistent evidence limit:

- CLI already capped `models_used`, `agent_metrics`, and `agent_modes` at 20, but missed `collection_sources`.
- Backend capped `models_used`, `agent_metrics`, and `agent_modes`, but missed `collection_sources`.
- Frontend normalized malformed evidence fields but did not fail closed on oversized evidence arrays.

That made the CLI/API/Frontend contract weaker for `collection_sources` than for sibling evidence fields.

## Changes

### CLI

- `src/draft/validation.ts`
  - `worklog.metrics.collection_sources` now uses the same 20-item cap as other metric evidence arrays.
- `tests/draft-validation.test.ts`
  - Added oversized evidence-array cases for `models_used`, `agent_metrics`, `agent_modes`, and `collection_sources`.

### Backend

- `app/schemas/worklog.py`
  - Preserved existing `app.schemas.worklog` import surface.
  - Split evidence/metrics/privacy helper schemas into `app/schemas/worklog_evidence.py` to keep files below the review-size ceiling.
- `app/schemas/worklog_evidence.py`
  - `WorklogMetrics.collection_sources` now has `max_length=20`.
- `tests/test_worklog_schema_contracts.py`
  - Added oversized `collection_sources` rejection coverage.

### Frontend

- `src/lib/api-worklog-metrics-source.ts`
  - API metric normalizer rejects oversized `models_used`, `agent_metrics`, `agent_modes`, and `collection_sources`.
- `src/lib/worklog-evidence-adapters.ts`
  - Card/detail adapter rejects oversized evidence arrays.
- `src/lib/collection-evidence.ts`
  - Review evidence helpers reject oversized evidence arrays.
- `src/lib/worklog-metric-evidence.contract.test.ts`
  - Added oversized evidence-array rejection cases.
- `src/lib/worklog-metric-evidence-fixtures.ts`
  - 2026-06-18 [[Frontend Worklog Metric Evidence Fixture Split 2026-06-18]] moved runner-owned metric evidence fixtures/assertions into this helper module.

## Verification

```bash
# CLI
npm run build && npm test
# result: 37 test files passed, 613 tests passed

# Backend
uv run ruff check app/schemas/worklog.py app/schemas/worklog_evidence.py tests/test_worklog_schema_contracts.py
uv run pytest \
  tests/test_ingestion_payload_contracts.py \
  tests/test_ingestion_cli_contracts.py \
  tests/test_worklog_response_model_contracts.py \
  tests/test_worklog_schema_contracts.py \
  tests/test_worklog_card_frontend_contracts.py
# result: ruff passed, 17 pytest tests passed

# Frontend
npm run lint && npm test
# result: tsc --noEmit passed, contract tests passed
```

## File-size review

| Repo | File | Pure LOC | Status |
| --- | --- | ---: | --- |
| CLI | `src/draft/validation.ts` | 225 | Warning band, unchanged structure |
| CLI | `tests/draft-validation.test.ts` | 148 | Healthy |
| Backend | `app/schemas/worklog.py` | 232 | Warning band, reduced below ceiling |
| Backend | `app/schemas/worklog_evidence.py` | 137 | Healthy |
| Backend | `tests/test_worklog_schema_contracts.py` | 94 | Healthy |
| Frontend | `src/lib/api-worklog-metrics-source.ts` | 190 | Healthy |
| Frontend | `src/lib/worklog-evidence-adapters.ts` | 233 | Warning band, no split required yet |
| Frontend | `src/lib/collection-evidence.ts` | 189 | Healthy |
| Frontend | `src/lib/worklog-metric-evidence.contract.test.ts` | originally 45; 2026-06-18 split runner 2 + fixture 53 | Healthy |

> [!warning]
> `src/lib/worklog-evidence-adapters.ts` and `src/draft/validation.ts` are still in the warning band. Split them before the next non-trivial logic addition.

## Follow-up

- [x] Frontend runner-owned metric evidence fixtures/assertions moved in [[Frontend Worklog Metric Evidence Fixture Split 2026-06-18]].
- [ ] Continue cross-repo contract slices, especially publish/review error envelopes.
- [ ] Split Frontend `worklog-evidence-adapters.ts` if future adapter behavior grows.
- [ ] Split CLI `validation.ts` if future draft validation logic grows.

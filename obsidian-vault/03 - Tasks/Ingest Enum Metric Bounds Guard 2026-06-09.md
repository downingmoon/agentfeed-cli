---
title: Ingest Enum Metric Bounds Guard
date: 2026-06-09
status: done
tags:
  - agentfeed
  - contract
  - cli
  - backend
  - enterprise-readiness
related:
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
  - "[[Frontend Worklog Metrics Guard 2026-06-08]]"
  - "[[Public Count Response Schema Guard 2026-06-08]]"
---

# Ingest Enum Metric Bounds Guard 2026-06-09

## Context

[[Backend Ingest Strict Contract 2026-06-08]] already made server-bound ingest payloads fail closed for unknown nested fields. The remaining contract gap was that Backend ingest still accepted broad string values for canonical fields that the CLI and Frontend treat as finite sets.

> [!warning] Contract risk
> If Backend stores an unknown `source.agent` or `worklog.category`, Frontend filtering/rendering can drift from the values emitted by CLI. If CLI loads a locally corrupted draft with negative metrics, Backend/Frontend contracts reject it later instead of showing an actionable local draft error.

## Changes

### Backend

- `app/schemas/ingestion.py`
  - `IngestSource.agent` now uses canonical `AgentType`.
  - `IngestWorklogPayload.category` now uses canonical `WorklogCategory` with `other` as the default.
- `tests/test_contracts.py`
  - Added regression coverage that rejects unknown CLI agent/category values before database write.

### CLI

- `src/draft/validation.ts`
  - Added non-negative validation for aggregate metrics and per-agent metrics.
  - Added non-negative integer validation for `worklog.timeline[].order`.
- `tests/git-draft.test.ts`
  - Added corrupted draft regressions for negative aggregate metric, negative per-agent metric, and negative timeline order.

## Verification

- Backend targeted contract tests: `2 passed`.
- Backend full contract suite: `389 passed, 1 warning`.
- Frontend contract suite: `npm run test:contracts` passed.
- CLI targeted draft tests: `22 passed`.
- CLI full test suite: `571 passed`.
- CLI build: `tsc` and `ensure-bin-executable` passed.

## Follow-up

- Continue auditing remaining CLI/API/Frontend contracts for broad string fields that should be canonical enums.
- Keep personal-server deployment separate from enterprise-readiness contract hardening unless the user explicitly requests a deploy for the completed work.

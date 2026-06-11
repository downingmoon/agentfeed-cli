---
title: Metric Evidence Label Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/contracts
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - enterprise-quality
status: done
related:
  - "[[CLI API Data Envelope Boundary 2026-06-11]]"
---

# Metric Evidence Label Contract 2026-06-11

## Summary

CLI, Backend, and Frontend now agree that multi-agent metric evidence labels must be non-empty strings before they can be uploaded, stored, parsed, or rendered.

The tightened fields are:

- `worklog.metrics.models_used[]`
- `worklog.metrics.agent_modes[]`
- `worklog.metrics.agent_metrics[].agent_modes[]`
- `worklog.metrics.collection_sources[].name`

## Why

The Frontend review evidence path already treats blank model names, blank agent modes, and blank collection source names as contract failures. CLI and Backend previously allowed some blank labels, which could create a CLI → API → Frontend mismatch or force the UI into silent fallback behavior.

## Changed

### CLI

- `src/draft/validation-primitives.ts`
- `src/draft/validation.ts`
- `tests/draft-validation.test.ts`

Local draft validation now rejects blank metric evidence labels before upload.

### Backend

- `app/schemas/worklog.py`
- `tests/test_worklog_schema_contracts.py`

`WorklogMetrics` now uses a non-empty `MetricEvidenceLabel` type for model names, agent modes, and collection source names.

### Frontend

- `src/lib/api-contract-primitives.ts`
- `src/lib/api-worklog-metrics-source.ts`
- `src/lib/worklog-metric-evidence.contract.test.ts`
- `scripts/run-contract-tests.mjs`

API response normalization now rejects blank metric evidence labels before adapters or components render feed/review UI.

## Verification

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run typecheck
npm test -- --run
npm run build

cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest tests/test_worklog_schema_contracts.py
uv run ruff check app/schemas/worklog.py tests/test_worklog_schema_contracts.py

cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm test
```

Evidence:

- CLI: typecheck passed; 36 Vitest files / 611 tests passed; build passed.
- Backend: targeted schema contract tests passed; Ruff passed.
- Frontend: TypeScript lint passed; contract tests passed.
- Server deployment was intentionally skipped.

## Commits

- CLI: `38c8377 Reject empty CLI metric evidence labels`
- Backend: `5ceb51e Reject empty worklog metric evidence labels`
- Frontend: `107f130 Reject empty frontend metric evidence labels`

## Remaining follow-up

> [!todo]
> Continue the enterprise-quality contract sweep with review URL trust assumptions and public/private `source` field scopes. Explorer review found the current differences appear intentional, but they should remain documented as explicit scope boundaries.

> [!warning]
> Server, infra, and CI/CD remain out of scope for this goal until explicitly re-enabled.

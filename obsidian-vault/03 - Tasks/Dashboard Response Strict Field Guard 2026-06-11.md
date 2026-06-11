---
title: Dashboard Response Strict Field Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - contract
  - dashboard
status: done
---

# Dashboard Response Strict Field Guard 2026-06-11

## Context

Backend dashboard schemas already use `extra="forbid"`:

- `DashboardPeriodStats`
- `DashboardSummaryResponse`
- `DashboardRecentWorklog`

The frontend dashboard parser validated counter types, status values, dates, and internal `action_url`, but it did not reject additional backend fields. That meant a backend/API drift such as `debug`, `raw_tokens`, or `raw_status` could silently pass into the dashboard boundary instead of surfacing as a visible contract error.

## Changed

- Added focused frontend contract coverage in `src/lib/dashboard-strict-fields.contract.test.ts`.
- Registered the new contract test in `scripts/run-contract-tests.mjs` so future contract runs cannot silently skip it.
- Updated `src/lib/api-dashboard.ts` to reject unexpected fields for:
  - dashboard summary root
  - `today` / `week` period stat objects
  - recent worklog list items

## Verification

> [!success]
> Fresh verification passed after the red test reproduced the missing guard.

- Red check: `npm run test:contracts` failed on `dashboard summary root extra fields did not fail closed` before implementation.
- Frontend: `npm run lint && npm test`
- Backend contract counterpart: `uv run pytest tests/test_route_response_model_contracts.py tests/test_dashboard_count_response_model_contracts.py tests/test_dashboard_contracts.py`
- LSP caveat: TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc --noEmit` passed through `npm run lint`.

## Follow-up

- Continue auditing remaining read-side frontend normalizers against backend `extra="forbid"` schemas.
- Prioritize actual parser/schema gaps over redundant edits where both sides already fail closed.

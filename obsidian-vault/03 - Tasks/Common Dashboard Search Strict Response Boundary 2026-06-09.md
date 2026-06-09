---
title: Common Dashboard Search Strict Response Boundary
date: 2026-06-09
status: done
tags:
  - agentfeed
  - backend
  - contract
  - dashboard
  - search
  - enterprise-readiness
related:
  - "[[User Project Strict Response Boundary 2026-06-09]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
  - "[[Strict Read List Envelope Guard 2026-06-08]]"
---

# Common Dashboard Search Strict Response Boundary 2026-06-09

## Context

After tightening review/privacy and user/project response models, the remaining obvious `extra=ignore` surface was the common response envelope plus dashboard/search responses.

These schemas are high leverage because they sit at API top-level boundaries:

- `DataResponse[T]`
- `ListResponse[T]`
- `Pagination`
- API metadata, health, readiness, and error wrappers
- dashboard summary/recent-worklog payloads
- search result payloads

> [!warning] Contract risk
> If top-level envelopes or search/dashboard payloads silently ignore unexpected fields, Backend contract tests can miss accidental debug/raw/private fields even when nested domain models are strict.

## Changes

### Backend

- `agentfeed-backend/app/schemas/common.py`
  - Added `ConfigDict(extra="forbid")` to common API envelope and health/metadata/error/readiness models.
  - Preserved arbitrary nested content inside `ErrorDetail.details`; only unexpected model fields are rejected.
- `agentfeed-backend/app/schemas/dashboard.py`
  - Added strict extra-field rejection to `DashboardPeriodStats`, `DashboardSummaryResponse`, and `DashboardRecentWorklog`.
- `agentfeed-backend/app/schemas/search.py`
  - Added strict extra-field rejection to `SearchPromptResult`, `SearchResults`, and `SearchResponse`.
- `agentfeed-backend/tests/test_contracts.py`
  - Added regression coverage for valid common envelopes and nested metadata/readiness/error payloads.
  - Added malformed cases for top-level and nested extra fields in common wrappers.
  - Added malformed cases for dashboard/search raw/debug fields.

## Deliberate non-change

Frontend and CLI were not modified in this pass.

> [!info]
> This pass closes Backend response schema strictness. It does not alter API routes, response shapes, or client behavior except that off-contract extra fields now fail validation instead of being silently dropped.

## Verification

- Backend targeted tests: `5 passed`.
- Backend full contract suite: `394 passed, 1 warning`.

## Follow-up

- Continue scanning remaining Backend schema modules for `extra=ignore`, especially auth/social/notification/integration/explore/discovery/moderation response payloads.
- For intentionally extensible payloads, document the exception explicitly instead of tightening blindly.
- No server deployment was performed for this pass, per active goal constraints.

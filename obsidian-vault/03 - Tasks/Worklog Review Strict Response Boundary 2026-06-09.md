---
title: Worklog Review Strict Response Boundary
date: 2026-06-09
status: done
tags:
  - agentfeed
  - backend
  - contract
  - privacy
  - enterprise-readiness
related:
  - "[[Multi Agent Evidence Agent Enum Guard 2026-06-09]]"
  - "[[Direct Worklog Mutation Enum Guard 2026-06-09]]"
  - "[[Worklog Review Response Guard 2026-06-08]]"
---

# Worklog Review Strict Response Boundary 2026-06-09

## Context

Review responses are the final owner-facing boundary before a worklog is published. Several nested response models still used Pydantic's default `extra=ignore` behavior, so tests using `model_validate()` could silently drop unexpected fields instead of proving the API contract is strict.

> [!warning] Contract risk
> If review/privacy payloads can silently ignore extra fields, a future router change may accidentally attach raw paths, raw scan context, or debug/private fields without contract tests failing at the schema boundary.

## Changes

### Backend

- `agentfeed-backend/app/schemas/worklog.py`
  - Added `ConfigDict(extra="forbid")` to review/privacy source models:
    - `CollectionWindow`
    - `WorklogSource`
    - `PrivacyFinding`
    - `PrivacyScanResult`
    - `WorklogReviewSource`
    - `WorklogReviewWorklog`
    - `WorklogReviewPreview`
    - `WorklogReviewResponse`
- `agentfeed-backend/tests/test_contracts.py`
  - Added regression coverage proving valid review payloads still parse.
  - Added malformed cases proving extra raw/private/debug fields are rejected at nested review/privacy boundaries.

## Deliberate non-change

Frontend and CLI code were not changed in this pass.

> [!info]
> The observed gap was in Backend response model strictness. Frontend already has runtime adapter guards for review evidence, and CLI does not consume this review response boundary.

## Verification

- Backend targeted tests: `3 passed`.
- Backend full contract suite: `391 passed, 1 warning`.

## Follow-up

- Continue reviewing other response model groups for Pydantic default `extra=ignore`, especially user/profile/project response models.
- If broad response models need `from_attributes`, convert them to `ConfigDict(from_attributes=True, extra="forbid")` only after targeted regression coverage is added.
- No server deployment was performed for this pass, per active goal constraints.

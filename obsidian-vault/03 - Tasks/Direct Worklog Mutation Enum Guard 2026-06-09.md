---
title: Direct Worklog Mutation Enum Guard
date: 2026-06-09
status: done
tags:
  - agentfeed
  - backend
  - frontend
  - contract
  - enterprise-readiness
related:
  - "[[Ingest Enum Metric Bounds Guard 2026-06-09]]"
  - "[[Frontend Feed Category Contract Guard 2026-06-09]]"
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
---

# Direct Worklog Mutation Enum Guard 2026-06-09

## Context

The previous ingest guard made CLI upload payloads reject off-contract `agent` and `category` values. A second path remained: direct `/worklogs` create/update mutations could still accept arbitrary strings for the same DB-backed fields.

> [!warning] Contract risk
> If direct web/API worklog mutations store an unknown agent or category, Feed filters, agent glyphs, and category labels can drift even though CLI ingest is strict.

## Changes

### Backend

- `app/schemas/worklog.py`
  - `CreateWorklogRequest.agent` now uses canonical `AgentType`.
  - `CreateWorklogRequest.category` now uses canonical `WorklogCategory` with `other` default.
  - `UpdateWorklogRequest.category` now uses canonical `WorklogCategory`.
- `app/routers/worklogs.py`
  - Stores enum-backed mutation values as plain strings before database assignment.
  - Serializes update bodies with `mode="json"` so enum values do not leak as enum objects into model attributes.
- `tests/test_contracts.py`
  - Added validation regressions for unknown direct-create agent/category and unknown direct-update category.
  - Added router assertion that created worklog rows store canonical string values.

### Frontend

- `src/lib/api.ts`
  - Added exported canonical `WORKLOG_AGENT_TYPES` and `WORKLOG_CATEGORIES` constants.
  - Narrowed `CreateWorklogBody.agent` and `CreateWorklogBody.category` to union types derived from those constants.
- `src/lib/api-contract.test.ts`
  - Added runtime/type contract coverage for direct worklog mutation bodies and canonical category coverage.

## Verification

- Backend targeted tests: `3 passed`.
- Backend full contract suite: `389 passed, 1 warning`.
- Frontend contract suite: `npm run test:contracts` passed.
- Frontend typecheck: `npm run lint` passed.
- Frontend production build: `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` passed.

## Follow-up

- Continue scanning Backend request schemas for broad strings that map to known enum-backed UI states.
- Avoid database-level enum migration for now unless a later readiness pass proves existing rows are already canonical or includes a safe data migration plan.

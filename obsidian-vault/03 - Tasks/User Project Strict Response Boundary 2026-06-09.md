---
title: User Project Strict Response Boundary
date: 2026-06-09
status: done
tags:
  - agentfeed
  - backend
  - contract
  - profile
  - project
  - enterprise-readiness
related:
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
  - "[[Multi Agent Evidence Agent Enum Guard 2026-06-09]]"
  - "[[User Account Response Guard 2026-06-08]]"
---

# User Project Strict Response Boundary 2026-06-09

## Context

The previous strict-response pass tightened review/privacy payloads. A follow-up scan found the same Pydantic default `extra=ignore` risk in user/profile/project response models.

These models are reused across Feed, Profile, Project, Search, and Worklog cards as nested `author`, `owner`, `project`, and stats payloads.

> [!warning] Contract risk
> If `PublicUser`, project stats, or project response models silently ignore unexpected fields, API contract tests can pass even when a router accidentally attaches private email/token/debug/deploy metadata to public-facing payloads.

## Changes

### Backend

- `agentfeed-backend/app/schemas/user.py`
  - Added strict extra-field rejection to:
    - `UserPublicStats`
    - `UserViewerState`
    - `PublicUser`
    - `User`
    - `SetUsernameResponse`
    - `UsernameCheckResponse`
    - `UserActivityDay`
    - `UserActivityResponse`
  - Preserved `from_attributes=True` for ORM-backed `PublicUser` and `User`.
- `agentfeed-backend/app/schemas/project.py`
  - Added strict extra-field rejection to:
    - `ProjectStats`
    - `ProjectSummary`
    - `Project`
    - `ProjectDetail`
    - `UserProjectSummary`
    - `ProjectSearchResult`
  - Preserved `from_attributes=True` for ORM-backed project models.
- `agentfeed-backend/tests/test_contracts.py`
  - Added valid nested payload checks for profile/project/activity responses.
  - Added malformed cases for private/debug/raw/deploy metadata on user and project response models.

## Deliberate non-change

Frontend and CLI were not modified.

> [!info]
> This pass only closes Backend response schema gaps. Frontend already validates many consumed user/project fields at adapter/API boundaries, and CLI does not consume these public profile/project responses directly.

## Verification

- Backend targeted tests: `3 passed`.
- Backend full contract suite: `392 passed, 1 warning`.

## Follow-up

- Continue scanning remaining Backend response schemas such as dashboard/search/common wrappers for `extra=ignore` risk.
- Avoid tightening common generic wrappers without explicit tests, because they are used across every route.
- No server deployment was performed for this pass, per active goal constraints.

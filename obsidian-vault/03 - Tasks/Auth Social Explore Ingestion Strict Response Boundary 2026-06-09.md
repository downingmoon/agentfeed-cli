---
title: Auth Social Explore Ingestion Strict Response Boundary
date: 2026-06-09
status: done
tags:
  - agentfeed
  - backend
  - contract
  - auth
  - social
  - ingestion
  - enterprise-readiness
related:
  - "[[Common Dashboard Search Strict Response Boundary 2026-06-09]]"
  - "[[User Project Strict Response Boundary 2026-06-09]]"
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
---

# Auth Social Explore Ingestion Strict Response Boundary 2026-06-09

## Context

After common/dashboard/search and user/project response models were made fail-closed, the remaining response-schema scan found broad Pydantic `extra=ignore` behavior in auth, social, notification, integration, explore, discovery, moderation, settings, and ingestion response models.

> [!warning] Contract risk
> These models expose sensitive-adjacent surfaces such as CLI auth exchange, ingestion tokens, settings, notifications, moderation reports, and public discovery. If unexpected fields are silently ignored in schema validation, contract tests can miss accidental raw token hashes, private emails, debug payloads, or internal moderation notes.

## Changes

### Backend

- `agentfeed-backend/app/schemas/auth.py`
  - Added strict extra-field rejection to auth/token/CLI-auth response models.
- `agentfeed-backend/app/schemas/social.py`
  - Added strict extra-field rejection to like/bookmark/follow/comment responses.
  - Preserved `from_attributes=True` for ORM-backed `Comment`.
- `agentfeed-backend/app/schemas/notification.py`
  - Added strict extra-field rejection to `Notification` and `NotificationReadResponse`.
  - Preserved `NotificationTarget` as the intentional `extra="allow"` exception because notification targets carry typed payload extensions.
- `agentfeed-backend/app/schemas/integration.py`
  - Added strict extra-field rejection to integration status and setup-guide payloads.
- `agentfeed-backend/app/schemas/explore.py`
  - Added strict extra-field rejection to explore sections, projects, prompts, rising builders, and categories.
- `agentfeed-backend/app/schemas/discovery.py`
  - Added strict extra-field rejection to tags and search suggestions.
- `agentfeed-backend/app/schemas/moderation.py`
  - Added strict extra-field rejection to moderation reports.
- `agentfeed-backend/app/schemas/settings.py`
  - Added strict extra-field rejection to privacy/notification settings and settings responses.
- `agentfeed-backend/app/schemas/ingestion.py`
  - Added strict extra-field rejection to ingestion token/status/rotate/ingest/preview response models.
  - Preserved `from_attributes=True` for ORM-backed ingestion token list items.
- `agentfeed-backend/tests/test_contracts.py`
  - Added regression coverage for the newly strict public response models.
  - Added ingestion response regressions for raw token/hash/source leakage.
  - Added an explicit assertion that `NotificationTarget` still allows documented target payload extension.

## Deliberate exception

`NotificationTarget` remains `extra="allow"`.

> [!info]
> This exception is intentional because notification target payloads can carry context-specific extension fields. The surrounding `Notification` wrapper is strict, so only the target extension point stays open.

## Verification

- Backend targeted tests: `6 passed`.
- Backend full contract suite: `396 passed, 1 warning`.

## Follow-up

- Run a repository-wide audit to find any remaining `BaseModel` response classes without explicit `model_config`.
- For each remaining `extra="allow"` or missing config, either tighten it or document the extension rationale.
- No server deployment was performed for this pass, per active goal constraints.

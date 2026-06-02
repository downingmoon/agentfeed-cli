---
title: Commercial Readiness Hardening - Session Expiry and OAuth Audit Atomicity 2026-06-02
aliases:
  - Session Expiry Recovery
  - OAuth Audit Atomicity
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - hardening
status: complete
created: 2026-06-02
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Session Expiry and OAuth Audit Atomicity 2026-06-02

> [!success] Outcome
> Frontend 401/session-expiry recovery now stays visible instead of collapsing into a silent signed-out redirect. Backend GitHub OAuth account/token mutations are no longer committed before the `auth.login` audit event, and audit request IDs are indexed for incident lookup.

## Frontend — explicit session-expiry recovery

- `AppContext` now tracks `sessionExpiredError` separately from `authError`.
- API request 401 events set a visible session-expired recovery banner and clear stale auth-scoped social state.
- `auth.me()` 401 is surfaced on protected auth-recovery routes such as Dashboard, Settings, Notifications, Review, and CLI authorization.
- The session-expired banner offers both:
  - GitHub re-login for the current route.
  - In-place auth retry.
- Protected pages include `sessionExpiredError` in their `authRecoveryError` branch, preventing immediate redirect loops.

> [!note]
> `authError` remains reserved for API/network/bootstrap outages. This keeps Header and recovery CTAs from being disabled by a session-expired state that should allow re-login.

## Backend — OAuth audit atomicity

- `get_or_create_user()` and the race-reuse helper no longer call `db.commit()` internally.
- GitHub provider token rotation, user/account creation, default settings creation, and `auth.login` audit event now commit together in `github_callback()`.
- Contract tests assert that OAuth user upsert helpers do not commit before auth audit recording.

## Backend — request-id incident lookup index

- Added `ix_audit_events_request_id_created_at` partial PostgreSQL index.
- New Alembic revision: `020_audit_request_id_index`.
- Model and migration contracts assert the request-id index shape and reversibility.

## 병렬 감사 결과에서 남은 후보

> [!todo] Remaining candidates
> No critical immediate issue was found. The next useful P1 candidates are below.

1. Backend social/UGC mutation audit coverage:
   - follow/unfollow
   - like/unlike
   - bookmark/unbookmark
   - comment creation
2. CLI local draft runtime shape validation.
3. CLI credentials runtime shape validation.

## 검증 증거

> [!example] Local verification
> - Frontend: `npm run test` — passed
> - Frontend: `npm run lint` — passed
> - Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` — passed
> - Backend targeted: `ruff check app/services/auth.py app/models/audit.py alembic/versions/020_audit_request_id_index.py tests/test_contracts.py` — passed
> - Backend targeted: OAuth/audit request-id selected pytest — 9 passed
> - Backend full: `uv run --locked --group dev ruff check app tests && uv run --locked --group dev pytest` — 318 passed, 1 warning
> - Backend Alembic offline SQL includes `CREATE INDEX ix_audit_events_request_id_created_at ... WHERE request_id IS NOT NULL`
> - Dev integration: `./scripts/test-all.sh` — passed after Frontend + Backend changes

## 남은 외부 릴리즈 차단

> [!warning]
> Hosted deployment is still the release blocker, not local code readiness: `agentfeed.dev` still has stale `/login` behavior and `api.agentfeed.dev` DNS/deployment must be available before default commercial readiness can pass.

## 연결

- [[Auth & Credential Safety]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Config Schema Audit Coverage and Session Recovery Candidate 2026-06-02]]
- [[Active Tasks]]

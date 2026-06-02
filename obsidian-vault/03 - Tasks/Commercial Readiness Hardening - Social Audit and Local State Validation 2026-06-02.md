---
title: Commercial Readiness Hardening - Social Audit and Local State Validation 2026-06-02
aliases:
  - Social Audit Coverage
  - CLI Local State Validation
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/cli
  - hardening
status: complete
created: 2026-06-02
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Collection System]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Social Audit and Local State Validation 2026-06-02

> [!success] Outcome
> Backend social/UGC state changes are now request-correlatable audit events, and CLI no longer trusts hand-edited local draft/credential JSON shapes as valid runtime state.

## Backend — social/UGC audit coverage

State-changing moderation-relevant mutations now record durable audit events with `request_id`:

- `user.follow.created`
- `user.follow.deleted`
- `worklog.like.created`
- `worklog.like.deleted`
- `worklog.bookmark.created`
- `worklog.bookmark.deleted`
- `worklog.comment.created`

> [!important]
> Audit events are written only when state actually changes. Duplicate/idempotent creates and unique-race rollbacks do not emit false audit rows.

Comment audit metadata stores IDs and `body_length` only. It does not store raw comment body text.

## CLI — local draft runtime validation

- Added dependency-free `validateLocalDraft()` for `.agentfeed/drafts/*.json`.
- `readDraft()` now rejects corrupted local draft shapes with actionable recovery guidance.
- Guarded fields include `worklog`, `upload`, `privacy_scan.findings`, metrics, source, timeline, and review handoff metadata.
- `agentfeed status` uses a lightweight pending-upload check so one corrupted draft does not zero the whole pending count.

## CLI — credentials runtime validation

- Stored credentials JSON is normalized before use.
- Invalid non-string token/API/user metadata fields are ignored with warnings instead of flowing into URL/fetch paths.
- `AGENTFEED_TOKEN` still wins over invalid stored credentials.

## 검증 증거

> [!example] Local verification
> - Backend targeted: social/comment audit selected pytest — 9 passed
> - Backend full: `uv run --locked --group dev ruff check app tests && uv run --locked --group dev pytest` — 322 passed, 1 warning
> - CLI full: `npm test -- --run` — 23 files / 349 tests passed
> - CLI: `npm run typecheck` — passed
> - CLI: `npm run release:preflight` — passed
> - Dev integration: `./scripts/test-all.sh` — passed, including CLI/Frontend/Backend CI checks and Backend Alembic offline chain

## 남은 P1 후보

> [!todo] Remaining candidates
> - Additional Backend audit allowlist/source contract for any future mutation routes.
> - CLI status/doctor UX polish around showing corrupted draft IDs individually.
> - Hosted deployment/DNS readiness remains external release blocker.

## 연결

- [[Collection System]]
- [[Auth & Credential Safety]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Session Expiry and OAuth Audit Atomicity 2026-06-02]]
- [[Active Tasks]]

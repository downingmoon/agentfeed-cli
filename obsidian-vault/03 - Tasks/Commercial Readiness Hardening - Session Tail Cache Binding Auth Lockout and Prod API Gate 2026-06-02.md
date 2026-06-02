---
title: Commercial Readiness Hardening - Session Tail Cache Binding Auth Lockout and Prod API Gate 2026-06-02
aliases:
  - Session Tail Cache Binding Auth Lockout and Prod API Gate
  - 2026-06-02 P1 Commercial Hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/hardening
  - project/tasks
status: verified-local
created: 2026-06-02
related:
  - "[[Active Tasks]]"
  - "[[AgentFeed CLI MOC]]"
  - "[[Collection System]]"
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Session Tail Cache Binding Auth Lockout and Prod API Gate 2026-06-02

> [!success] Local verification status
> CLI, Backend, Frontend, Dev cross-repo local gates passed after this P1 hardening pass. Hosted release remains blocked by external deployment/DNS freshness, not by local code gates.

## Scope

Parallel audit found P1 gaps across the three repos:

- CLI session collection could silently lose newest agent evidence when JSONL logs exceeded parser/file bounds.
- CLI uploaded-draft reuse was bound only to payload hash, not to current API host/token/user identity.
- CLI `release:preflight` could smoke stale `dist` output if a developer skipped `prepack`.
- Backend public URL validation used request-time DNS resolution, and public search/activity endpoints lacked bounded query windows.
- Backend CLI approval code had no repeated-failure lockout.
- Frontend public anonymous visitors could see a global session-expired banner from `auth.me()` 401.
- Frontend public project list needed defensive filtering even if Backend returned private/unlisted rows.
- Frontend production CI compatibility should verify the hosted API by default while still allowing deterministic local/offline CI opt-out.

## Changes

### CLI — [[Collection System]] / [[Auth & Credential Safety]]

- Reads the tail of oversized AI-agent JSONL session logs instead of dropping them.
- Keeps newest JSONL records when parser row caps are hit.
- Stores `token_id` in local credentials when Browser Login returns it.
- Adds `upload.credential_binding_hash`, `api_base_url`, `token_id`, and `user_id` metadata to local draft upload cache.
- Reuses uploaded draft cache only when payload hash **and** current credential/API binding match.
- Makes `npm run release:preflight` run `npm run prepack` before tarball/install smoke.

### Backend — [[Auth & Credential Safety]] / [[Integration - CLI Backend Frontend]]

- Removes request-time DNS lookup from public URL validation to avoid synchronous network work in request paths.
- Adds search cursor offset cap: `MAX_SEARCH_CURSOR_OFFSET = 10_000`.
- Adds user activity date-range cap: `MAX_ACTIVITY_DATE_RANGE_DAYS = 180`.
- Adds CLI auth approval failure tracking and session lockout after 5 bad codes.
- Adds Alembic revision `022_cli_auth_approval_lockout`.

### Frontend — [[Integration - CLI Backend Frontend]]

- Suppresses global auth-error events for anonymous `auth.me()` 401 responses.
- Adds dynamic `/worklogs/:id/review` auth recovery route detection.
- Uses `adaptPublicProjectSummaries` for the public Projects page list.
- Runs live production API compatibility by default for production HTTPS non-local `NEXT_PUBLIC_API_URL`.
- Supports deterministic local/offline CI opt-out with `AGENTFEED_SKIP_PROD_API_COMPAT=1`.

### Dev coordination

- `scripts/test-all.sh` now sets `AGENTFEED_SKIP_PROD_API_COMPAT=1` for its deterministic local frontend CI run.
- Hosted API compatibility remains covered by hosted/commercial readiness paths and still fails until `api.agentfeed.dev` is deployed.

## Verification

- CLI: `npm run typecheck` → passed.
- CLI: `npm test -- --run` → 23 files / 355 tests passed.
- CLI: `npm run release:preflight` → passed, including `prepack`, tarball smoke, installed package smoke.
- Backend: `uv run --locked --group dev ruff check app tests` → passed.
- Backend: `uv run --locked --group dev pytest` → 326 passed, 1 warning.
- Backend: `uv run --locked alembic upgrade head --sql` → offline migration chain generated SQL through revision 022.
- Frontend: `npm run test:contracts` → passed.
- Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` → passed.
- Dev: `./scripts/test-all.sh` → passed.

> [!warning] External release blocker
> `https://api.agentfeed.dev/v1/metadata` still fails DNS resolution (`nodename nor servname provided, or not known`) and `https://agentfeed.dev/` still resolves to the stale `/login` deployment. The default commercial readiness gate cannot be marked complete until hosted Backend DNS/deploy and Frontend root freshness are fixed.

## Follow-up

- Keep [[Active Tasks#External release blockers]] open.
- After hosted deployment is fixed, run `make commercial-readiness` without local opt-out and require `COMMERCIAL_READINESS_PASSED`.

---
title: Commercial Readiness Hardening - Cached Publish Cursor and Branch Drift Gates
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/dev
  - agentfeed/ci
status: implemented
aliases:
  - Cached Publish Cursor Branch Drift 2026-06-04
---

# Commercial Readiness Hardening - Cached Publish Cursor and Branch Drift Gates

Related: [[Active Tasks]], [[Commercial Readiness Hardening - Lock Fingerprint Hostname and Compatibility Probes 2026-06-04]], [[Commercial Readiness Hardening - CLI Upload Token Preflight 2026-06-03]], [[Commercial Readiness Hardening - Hosted Readiness Diagnostics 2026-06-04]]

## Outcome

- CLI cached publish reuse now still requires live API compatibility and ingestion-token status preflight before handing back an existing review URL.
- Backend pagination cursors now have both offset bounds for leaderboard and a shared oversized-token decode guard.
- Dev commercial-readiness now fail-closes on cross-repo branch drift and records branch policy evidence in the manifest.
- Dev cross-repo marker contract was updated for the expanded frontend API compatibility probe set.

> [!warning] Remaining external blocker
> Strict hosted readiness is still blocked by `api.agentfeed.dev` DNS `ENOTFOUND` and `https://agentfeed.dev/` root redirecting to `/login`. These are deployment/DNS routing issues, not code-side verification gaps.

## Changes

### AgentFeed-CLI

- `src/cli/index.ts`
  - `agentfeed publish` now calls upload preflight for reusable cached uploads too.
  - This prevents local cache reuse from masking revoked tokens, API host rotation, or contract drift.
- `tests/cli-share.test.ts`
  - Added regression where reusable cache must fail when `/v1/ingest/status` rejects the token.
  - Updated cached publish tests to use local metadata/token preflight fixtures instead of relying on hosted DNS.

### agentfeed-backend

- `app/routers/leaderboard.py`
  - Added `MAX_LEADERBOARD_CURSOR_OFFSET` and 422 rejection for huge offset cursors.
- `app/utils/cursor.py`
  - Added `MAX_CURSOR_TOKEN_LENGTH` guard before base64/JSON decoding.
- `tests/test_contracts.py`
  - Locks leaderboard huge-offset rejection.
  - Locks oversized cursor token fallback without decode/parse work.

### agentfeed-dev

- `scripts/commercial-readiness.sh`
  - Adds expected branch policy for `dev=main`, `CLI=main`, `backend=master`, `frontend=main`.
  - Supports env overrides: `AGENTFEED_EXPECT_BRANCH_DEV`, `AGENTFEED_EXPECT_BRANCH_CLI`, `AGENTFEED_EXPECT_BRANCH_BACKEND`, `AGENTFEED_EXPECT_BRANCH_FRONTEND`.
  - Writes `branch_policy` status and violations into the manifest.
  - Fails before readiness steps when an existing git repo is on an unexpected branch.
- `scripts/test-commercial-readiness-exec.sh`
  - Adds branch mismatch fixture and manifest assertions.
- `scripts/test-all.sh`, `scripts/test-hosted-compatibility-smoke.sh`
  - Updated expected frontend compatibility marker to the expanded probe set.

## Verification

> [!success] CLI
> - `npm test -- --run tests/cli-share.test.ts` → 40 passed
> - `npm run typecheck` → passed
> - `npm run release:preflight` → 394 tests + build/typecheck/npm pack/install smoke passed

> [!success] Backend
> - `.venv/bin/python -m pytest tests/test_contracts.py -q -k 'cursor_decode_ignores_oversized_tokens or search_cursor_rejects_huge_offsets or leaderboard_cursor_rejects_huge_offsets or leaderboard_uses_cursor_offset or leaderboard_malformed_cursor'` → 5 passed
> - `.venv/bin/ruff check app/utils/cursor.py app/routers/leaderboard.py tests/test_contracts.py` → passed
> - `.venv/bin/python -m pytest -q` → 368 passed, 1 known StarletteDeprecationWarning

> [!success] Dev / cross-repo
> - `./scripts/test-commercial-readiness-exec.sh` → passed
> - `./scripts/test-hosted-compatibility-smoke.sh` → passed
> - `./scripts/test-all.sh` → passed; included CLI release preflight, frontend CI/build, backend ruff/pytest, and Alembic offline chain

## Follow-up candidates from parallel audit

- [ ] Frontend: hide `userNote`/private detail fields immediately when auth expires or current viewer permission is no longer valid.
- [ ] Backend: prune expired OAuth state nonce rows and abandoned CLI auth sessions.
- [ ] CLI: harden upload lock heartbeat for filesystems where `utimes` fails repeatedly.
- [ ] CLI release: add Windows release-path package wrapper smoke to release workflow.
- [ ] Dev: optional machine-readable `wait-ready` evidence artifact for local stack readiness.

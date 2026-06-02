---
title: Commercial Readiness Hardening - Runtime Contract and Ingest Identity 2026-06-03
aliases:
  - Runtime API Contract and Ingest Identity Gate
  - Stored Review URL Provenance Gate
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/api-contract
  - agentfeed/ingestion
status: done
created: 2026-06-03
updated: 2026-06-03
---

# Runtime Contract and Ingest Identity Gate

> [!success] Outcome
> Frontend runtime auth bootstrap now fails closed on backend API contract drift, CLI `agentfeed open` trusts the upload-time API provenance stored in the draft, and Backend ingest requires a stable source identity for idempotent worklog creation.

## Scope

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Runtime Configuration]]
- [[Collection System]]

## Changes

### Frontend runtime API compatibility gate

- `AppContext` now calls `system.metadata()` and `isBackendCompatible(metadata)` before `auth.me()`.
- Contract mismatch is surfaced separately as `apiCompatibilityError` through a red operator-visible banner.
- GitHub sign-in redirects and global auth-error recovery are skipped while the API contract is incompatible.
- `page-source-contract.test.ts` locks this runtime gate so compatibility does not remain CI-only.

> [!warning] Why this matters
> CI compatibility checks protect releases, but a stale deployment or mismatched runtime API can still reach users. The app shell must fail closed before login/review flows mutate state against an incompatible backend.

### CLI stored review URL provenance

- `agentfeed open` now validates saved `draft.upload.review_url` against:
  1. `draft.upload.api_base_url`
  2. current credential API base URL
  3. default hosted API base URL
- This preserves valid uploaded drafts after a user changes local `AGENTFEED_API_BASE_URL` or switches tokens.
- Split-host review URLs still require explicit `AGENTFEED_REVIEW_BASE_URL` and remain fail-closed by default.

### Backend ingest source identity

- `IngestSource` now requires at least one stable identity field:
  - `collection_fingerprint`
  - `local_draft_id`
  - `session_id`
- `_source_identity_candidates()` uses `session_id` as a fallback identity when stronger draft/window identity is absent.
- This prevents anonymous-source ingest payloads from bypassing idempotency and creating duplicate worklogs on retries.

## Verification Plan

- Frontend: `npm run test:contracts`, `npm run lint`, production build with `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev`.
- CLI: targeted `tests/cli-share.test.ts`, full test/prepack path if needed.
- Backend: targeted ingest contract tests, then full backend test suite.
- Cross-repo: `agentfeed-dev/scripts/test-all.sh` after commits.

## Remaining External Blocker

> [!failure] Hosted readiness is still external
> `api.agentfeed.dev` DNS/deployment and stale `https://agentfeed.dev/` `/login` redirect must be fixed before hosted readiness CI can pass end-to-end. This note records source-level hardening, not hosted DNS completion.

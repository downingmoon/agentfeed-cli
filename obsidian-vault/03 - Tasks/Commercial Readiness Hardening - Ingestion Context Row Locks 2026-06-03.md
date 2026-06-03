---
title: Commercial Readiness Hardening - Ingestion Context Row Locks
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/cli
  - security/token-lifecycle
status: verified
aliases:
  - Ingestion Context Row Locks 2026-06-03
---

# Commercial Readiness Hardening - Ingestion Context Row Locks

Related: [[Home]]

## Outcome

Backend ingestion-token context lookup now locks both lifecycle-sensitive rows before accepting and marking token usage:

- `IngestionToken` lookup uses `FOR UPDATE` while checking token hash and revocation state.
- Active `User` lookup uses `FOR UPDATE` before `last_used_at` is updated and committed.
- Contract coverage now asserts both token and user context statements include row locks.

> [!success] Commercial-readiness impact
> Token validate/use paths are safer against concurrent rotate/revoke/delete/expiry races while preserving the existing fail-closed checks.

## TDD Evidence

### RED

```bash
./.venv/bin/pytest tests/test_contracts.py -k "ingestion_token_updates_last_used_only_after_active_user_lookup" -q
```

Result: failed because the ingestion token query did not include `FOR UPDATE`.

### GREEN - targeted

```bash
./.venv/bin/pytest tests/test_contracts.py -k "ingestion_token_updates_last_used_only_after_active_user_lookup or ingestion_context_returns_token_metadata_for_status or ingestion_token_rejects_deleted_users_without_marking_token_used or ingestion_token_rejects_expired_tokens" -q
```

Result: `4 passed`.

### Full backend gate

```bash
./.venv/bin/ruff check . && ./.venv/bin/pytest -q
```

Result: `All checks passed!`, `362 passed, 1 warning in 1.33s`.

## Frontend Test Surface Finding

A parallel frontend check found the current frontend test stack is a custom source-contract runner, not a mounted React component test setup:

- `npm test` delegates to contract tests through `scripts/run-contract-tests.mjs`.
- There is no installed Jest/Vitest/JSDOM/React Testing Library/Playwright component-test dependency.
- Additional `/cli/authorize` coverage can be added safely as no-dependency source-contract assertions in `src/lib/page-source-contract.test.ts`.
- True mounted component behavior tests would require adding a new test framework and scripts.

## Remaining External Blocker

> [!warning] Hosted readiness still externally blocked
> Strict hosted frontend readiness remains blocked by production infrastructure, not local code: `api.agentfeed.dev` DNS is unresolved and `https://agentfeed.dev/` root redirects to `/login` with `307`.

## Next Candidates

- Add no-dependency frontend source-contract assertions for `/cli/authorize` cleanup and retry invariants.
- Add an optional PostgreSQL concurrency smoke around token rotate/revoke vs ingestion context acceptance when a realistic multi-connection test harness is available.

---
title: Commercial Readiness Hardening - Hook Release Notification and Intranet Policy 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Hook release notification and intranet policy hardening
  - Claude hook precision release pinning and notification actor privacy
---

# Hook release notification and intranet policy hardening

> [!success]
> 이번 슬라이스는 CLI hook integrity, release supply-chain guard, Frontend production API host policy, Backend notification privacy를 함께 하드닝했다.

## Context

- 상위 목표: [[Active Tasks#P1 후보]]
- CLI hook/release: [[Auth & Credential Safety]]
- Runtime host policy: [[Runtime Configuration]]
- Cross-repo contract: [[Integration - CLI Backend Frontend]]

## Problems

### CLI Claude Code hook detection was too broad

`hasAgentFeedHook()` and uninstall logic treated any nested string containing `agentfeed collect` as an AgentFeed-generated hook. This could skip install or remove unrelated user hook config that only mentioned the command in documentation or another automation step.

> [!warning]
> Hook install/uninstall touches user-owned `.claude/settings.json`; broad substring matching is a config-corruption risk.

### CLI release workflow action pinning checked only the first match

The release preflight accepted a workflow if the first `actions/checkout` or `actions/setup-node` reference was pinned, even if a later step used `@v6` or another mutable ref.

### Frontend private host policy drifted from Backend

Backend production public-host policy rejects `.intranet`, but Frontend runtime/build-time API URL guards did not. That created cross-repo policy drift for production API configuration.

### Backend notifications exposed soft-deleted actor metadata

`GET /v1/me/notifications` hydrated notification actors by `User.id` only. A soft-deleted actor could still appear in user-facing notification payloads.

## Changes

### CLI

- `src/hooks/claude-code-settings.ts`
  - Replaced broad `JSON.stringify(...).includes('agentfeed collect')` detection with a generated command-hook shape check.
  - Uninstall now removes only AgentFeed-generated command hooks, preserving unrelated hook commands that mention `agentfeed collect`.
- `scripts/release-preflight.mjs`
  - Release action pin validation now scans every `uses: actions/checkout@...` and `uses: actions/setup-node@...` occurrence.
  - Any mutable or unexpected ref fails the preflight.
- `tests/api-hook.test.ts`, `tests/release-preflight.test.ts`
  - Added regression coverage for unrelated hook text and extra unpinned action references.

### Frontend

- `src/lib/host-safety.ts`, `scripts/check-env.mjs`
  - Added `.intranet` to private/internal host suffix detection.
- `src/lib/api-url.contract.ts`, `scripts/check-env.contract.test.mjs`, `scripts/run-contract-tests.mjs`
  - Added runtime and build-time contracts for `.intranet` production API URL rejection.

### Backend

- `app/routers/notifications.py`
  - Actor hydration now queries only non-deleted users and also checks `deleted_at` before building a public actor payload.
- `tests/test_contracts.py`
  - Added regression coverage for soft-deleted notification actor suppression.
  - Added read-state mutation scope/idempotency contract coverage for notification read endpoints.

## Verification evidence

> [!example] RED — Frontend `.intranet`
> `npm run test:contracts` failed because `normalizeApiRoot('https://api.intranet', { nodeEnv: 'production' })` did not throw `private or internal`.

> [!success] GREEN — Frontend targeted
> `npm run test:contracts && npm run lint` passed after aligning runtime/build host policy.

> [!example] RED — CLI hook/release
> `npm test -- tests/api-hook.test.ts tests/release-preflight.test.ts` failed because unrelated hook text skipped AgentFeed hook install, and appended `actions/checkout@v6` passed release preflight.

> [!success] GREEN — CLI targeted
> `npm test -- tests/api-hook.test.ts tests/release-preflight.test.ts && npm run typecheck` passed.

> [!example] RED — Backend notification actor privacy
> `uv run --locked pytest tests/test_contracts.py -q -k 'notifications_suppress_soft_deleted_actors or notification_read_mutations_are_user_scoped'` failed because a soft-deleted actor was returned as a public actor payload.

> [!success] GREEN — Backend targeted
> `uv run --locked pytest tests/test_contracts.py -q -k 'notifications_suppress_soft_deleted_actors or notification_read_mutations_are_user_scoped' && uv run --locked ruff check app/routers/notifications.py tests/test_contracts.py` passed.

## Remaining risk

> [!warning]
> This does not complete hosted DNS/deployment smoke or credentialed GitHub OAuth live happy-path verification. Those remain external-state/credential-dependent readiness checks.

> [!todo]
> Frontend sidecar also identified oversized API response body parsing and request cancellation propagation as future P1 candidates.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]

---
title: Commercial Readiness Hardening - Keychain Unmatched Settings CI 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - security/hardening
status: completed
aliases:
  - Keychain Unmatched Settings CI Hardening
---

# Commercial Readiness Hardening - Keychain Unmatched Settings CI 2026-06-02

> [!success] Outcome
> Three independent P1 commercial-readiness gaps were closed in parallel: CLI native keychain helper env leakage, Backend unmatched-path rate-limit fail-open behavior, and Frontend Settings/API-config recovery plus local CI audit drift.

## Scope

- [[AgentFeed CLI MOC|CLI]]: scrub inherited environment for native keychain helper subprocesses.
- Backend API: apply a shared default `UNMATCHED <METHOD>` rate-limit bucket to unlisted paths.
- Frontend: hide GitHub sign-in recovery when Settings is blocked by API config failure, and make `npm run ci` own the production dependency audit.

## Changes

### CLI keychain subprocess env scrub

- Added keychain helper env construction through `createScrubbedCommandEnv(process.env, { respectAllowlist: false })`.
- Applied scrubbed env to macOS `security` and Linux `secret-tool` `execFile`/`spawn` calls.
- Added regression coverage proving `AGENTFEED_TOKEN`, npm/cloud/custom secrets, and `SSH_AUTH_SOCK` do not reach helper env even if allowlisted.

### Backend unmatched-path rate-limit fallback

- Added `UNMATCHED_RATE_LIMIT_RULE = RateLimitRule(120, 60)` and shared method bucket names such as `UNMATCHED GET`.
- Kept explicit test rule maps unchanged so unit tests can still isolate custom rule behavior.
- Forced unmatched route identity to IP bucket even when the caller supplies a valid JWT, preventing authenticated scanner identity fragmentation.

### Frontend Settings recovery and CI audit unification

- Settings auth recovery now offers the GitHub login CTA only when the source is a real auth error and not an API config failure.
- Redirect handler is guarded to avoid calling API-base normalization during API config recovery.
- `npm run ci` now runs `npm audit --omit=dev --audit-level=moderate`; GitHub Actions delegates to that unified gate instead of duplicating a separate audit step.

## Verification

```text
CLI: npm test -- --run && npm run typecheck && npm run release:preflight
- 23 test files passed
- 343 tests passed
- typecheck passed
- release preflight passed

Backend: uv run --locked --group dev ruff check app/middleware/rate_limit.py tests/test_rate_limit_store.py tests/test_contracts.py && uv run --locked --group dev pytest
- ruff passed
- 314 tests passed, 1 warning

Backend manual scanner check:
- 1 limited of 121, last_bucket=UNMATCHED GET

Frontend: npm run lint && npm run test && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci
- lint/typecheck passed
- contract tests passed
- production dependency audit found 0 vulnerabilities
- mock API compatibility passed
- production build passed

Dev integration: ../agentfeed-dev/scripts/test-all.sh
- OpenAPI contract gate passed
- CLI/Frontend/Backend gates passed
- Alembic offline migration chain captured 490 lines
```

## Remaining external blocker

> [!warning]
> Hosted commercial readiness is still blocked until `https://agentfeed.dev/` stops redirecting to `/login` and `api.agentfeed.dev` DNS/deployment resolves. Local and CI gates now cover more release-critical invariants, but hosted infrastructure still needs deployment/DNS correction.

## Next P1 candidates

- CLI project config runtime schema validation.
- Backend audit request-id propagation and mutation coverage.
- Hosted deployment/DNS smoke once infrastructure is updated.

## Related

- [[Commercial Readiness Hardening - Cursor Duplicate Start and CSRF Intent 2026-06-02]]
- [[Commercial Readiness Hardening - Metadata Rate Limit Degraded Fallback 2026-06-02]]
- [[Active Tasks]]

---
title: Commercial Readiness Hardening - Backend Health Readiness Rate Limits 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/backend
  - agentfeed/operations
  - agentfeed/rate-limits
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Backend health readiness rate limits
  - Health readiness probing quota
---

# Backend health/readiness rate limits

> [!success]
> Backend `/health` and `/health/ready` now have explicit IP-based rate-limit rules, so unauthenticated probe traffic cannot bypass the quota contract.

## Context

- Builds on [[Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02]]
- Related operational path: hosted readiness checks and deployment smoke gates
- Integration map: [[Integration - CLI Backend Frontend]]

## Problem

The Backend had global rate-limit middleware, but health/readiness paths were not explicit entries in the route rule map. `/health/ready` performs database and migration checks, so unbounded unauthenticated probe traffic could amplify production load during outages or hostile scans.

## Contract

1. `GET /health` has an explicit `RateLimitRule`.
2. `GET /health/ready` has an explicit `RateLimitRule`.
3. Both routes are IP-based even when arbitrary Bearer tokens are present.
4. Trailing slash and duplicate slash normalization still maps to the same route bucket.
5. Over-limit responses preserve the existing `RATE_LIMITED` JSON contract, `Retry-After`, and request ID propagation.

## Changes

- Backend `app/middleware/rate_limit.py`
  - Added `GET /health` and `GET /health/ready` to `RATE_LIMIT_RULES`.
  - Added both routes to `IP_BASED_RATE_LIMIT_PATHS`.
- Backend `tests/test_contracts.py`
  - Added rule/normalization/IP identity regression.
  - Added over-limit contract regression for `/health` and `/health/ready`.

## Verification evidence

> [!example] RED
> Executor TDD lane first ran `uv run pytest -q tests/test_contracts.py -k "health_rate_limit_rules_are_ip_based or health_routes_return_rate_limit_contract"`, which failed because `("GET", "/health")` and `("GET", "/health/ready")` were missing from `RATE_LIMIT_RULES`.

> [!success] GREEN — owner targeted verification
> `uv run ruff check app/middleware/rate_limit.py tests/test_contracts.py` passed.

> [!success] GREEN — owner targeted health/rate-limit regression
> `uv run pytest -q tests/test_contracts.py -k "health_rate_limit_rules_are_ip_based or health_routes_return_rate_limit_contract"` passed: 2 tests.

> [!success] GREEN — executor broader backend verification
> Executor lane reported `uv run pytest -q tests/test_rate_limit_store.py tests/test_contracts.py -k "rate_limit or health"` passed: 26 tests, and `uv run pytest -q` passed: 289 tests.

## Remaining risk

> [!warning]
> This protects readiness probe traffic in the Backend. It does not by itself prove hosted DNS/deployment is live; `make smoke-hosted-compatibility` still needs to pass once `api.agentfeed.dev` resolves.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02]]

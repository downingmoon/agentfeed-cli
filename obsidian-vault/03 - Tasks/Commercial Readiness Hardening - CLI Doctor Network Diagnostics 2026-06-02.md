---
title: Commercial Readiness Hardening - CLI Doctor Network Diagnostics 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - agentfeed/operations
  - agentfeed/commercial-readiness
  - agentfeed/integration
status: completed
aliases:
  - CLI doctor network diagnostics
  - AgentFeed CLI DNS diagnostics
---

# CLI doctor network diagnostics

> [!success]
> `agentfeed doctor` now classifies API transport failures instead of collapsing them to opaque `fetch failed` output.

## Context

- Builds on [[Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02]]
- Integration map: [[Integration - CLI Backend Frontend]]
- Related command: `agentfeed doctor`

## Problem

The hosted compatibility smoke now reports `api.agentfeed.dev` DNS/deployment failures clearly, but a user running CLI diagnostics directly could still see only `fetch failed`. For commercial operations, CLI self-diagnosis needs to identify whether the failure is DNS, timeout, connection-refused, or TLS/certificate related.

## Contract

`agentfeed doctor` must keep credential/API provenance visible and then show actionable API health/compatibility failures:

1. DNS failures mention the hostname.
2. DNS failures mention `AGENTFEED_API_BASE_URL` as the remediation surface.
3. API readiness and API compatibility checks share the same transport classification.
4. Upload/publish network errors reuse the same classification when possible.

## Changes

- `src/api/client.ts`
  - Added bounded fetch-check timeout constant for doctor-style checks.
  - Added transport failure classification over Node fetch error cause chains.
  - Classifies DNS lookup, connection-refused, timeout, and TLS/certificate failures.
  - Reuses classification in generic API network failure messages.
- `tests/cli-status-doctor.test.ts`
  - Added a regression for `https://agentfeed-doctor.invalid/v1` proving DNS host/remediation output.

## Verification evidence

> [!example] RED
> `npm test -- tests/cli-status-doctor.test.ts -t "doctor classifies API DNS failures"` failed because `API ready` and `API compatibility` printed `fetch failed`.

> [!success] GREEN — targeted doctor DNS regression
> `npm test -- tests/cli-status-doctor.test.ts -t "doctor classifies API DNS failures"` passed.

> [!success] GREEN — full doctor/status regression
> `npm test -- tests/cli-status-doctor.test.ts` passed: 15 tests.

> [!success] GREEN — CLI typecheck
> `npm run typecheck` passed.

> [!success] GREEN — full CLI regression
> `npm test -- --run` passed: 21 files and 327 tests.

## Remaining risk

> [!warning]
> This improves CLI-side diagnosis only. The actual production hosted smoke still requires `api.agentfeed.dev` DNS/deployment to resolve before it can prove live hosted compatibility.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Hosted Compatibility Smoke 2026-06-02]]

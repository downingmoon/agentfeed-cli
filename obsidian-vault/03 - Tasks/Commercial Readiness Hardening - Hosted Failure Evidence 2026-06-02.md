---
title: Commercial Readiness Hardening - Hosted Failure Evidence 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/dev
  - agentfeed/operations
  - agentfeed/commercial-readiness
  - agentfeed/evidence
status: completed
aliases:
  - Hosted smoke failure evidence
  - Commercial readiness failure artifact
---

# Hosted failure evidence

> [!success]
> Hosted compatibility smoke now writes machine-readable failure evidence as well as success evidence, so failed commercial-readiness runs retain the failure stage, message, URL configuration, repo SHAs, and any partial artifacts.

## Context

- Builds on [[Commercial Readiness Hardening - Hosted Evidence and Frontend Prod API Gate 2026-06-02]].
- Related area: [[Runtime Configuration]].
- Integration map: [[Integration - CLI Backend Frontend]].

## Problem

Hosted smoke success evidence was durable, but failure paths still exited through `fail()` without a structured `hosted-compatibility-evidence.json`. That meant release reviewers could see logs from `commercial-readiness`, but could not reliably parse why hosted compatibility failed or which stage failed.

## Contract

1. When `AGENTFEED_SMOKE_EVIDENCE_DIR` is set, hosted smoke writes `hosted-compatibility-evidence.json` on failure.
2. Failure JSON contains:
   - `status: failed`
   - `started_at` and `completed_at`
   - `failure_stage`
   - `failure_message`
   - hosted frontend/API URL configuration
   - repo SHAs
   - partial artifact references if already captured
3. Failure JSON omits `pass_marker`.
4. Success JSON now includes `status: passed`, `started_at`, and `completed_at`.

## Changes

- Dev `scripts/smoke-hosted-compatibility.sh`
  - Added failure-stage derivation and failure evidence writer.
  - Copies partial evidence files before writing failure JSON.
  - Adds status/timing fields to success evidence.
- Dev `scripts/test-hosted-compatibility-smoke.sh`
  - Added dynamic stale Frontend failure evidence assertion.
  - Added dynamic API DNS failure evidence assertion.
- Dev `scripts/test-commercial-readiness-gate.sh`
  - Added source-contract assertions for `failure_message` and `failure_stage`.
- Dev `README.md`
  - Documented failure evidence fields.

## Verification evidence

> [!example] RED
> `./scripts/test-hosted-compatibility-smoke.sh && ./scripts/test-commercial-readiness-gate.sh` failed after adding `failure_message` / `failure_stage` assertions because the smoke script did not write structured failure evidence.

> [!success] GREEN — targeted contracts
> `./scripts/test-hosted-compatibility-smoke.sh` passed.
>
> `./scripts/test-commercial-readiness-gate.sh` passed.
>
> `bash -n scripts/smoke-hosted-compatibility.sh scripts/commercial-readiness.sh && ./scripts/check-action-pins.sh` passed.

> [!success] GREEN — dynamic success evidence
> Mock hosted success run with `AGENTFEED_SMOKE_EVIDENCE_DIR` verified `status: passed`, `started_at`, `completed_at`, `HOSTED_COMPATIBILITY_SMOKE_PASSED`, and expected artifact names.

> [!success] GREEN — cross-repo gate
> `agentfeed-dev ./scripts/test-all.sh` passed across dev contracts, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend Ruff/tests/Alembic offline chain, and OpenAPI contract gate.

## Remaining risk

> [!warning]
> This improves failure and success evidence quality. It still does not replace the external deployment requirement: real `https://agentfeed.dev` and `https://api.agentfeed.dev/v1` must be healthy before default `make commercial-readiness` can pass.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Hosted Evidence and Frontend Prod API Gate 2026-06-02]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]

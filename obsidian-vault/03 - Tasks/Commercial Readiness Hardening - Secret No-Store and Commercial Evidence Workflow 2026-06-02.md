---
title: Commercial Readiness Hardening - Secret No-Store and Commercial Evidence Workflow 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/backend
  - agentfeed/dev
  - agentfeed/commercial-readiness
  - agentfeed/security
status: completed
aliases:
  - Secret no-store and commercial evidence workflow
  - Commercial readiness evidence workflow
---

# Secret no-store and commercial evidence workflow

> [!success]
> This pass tightened two repo-local commercial readiness gaps without requiring hosted DNS changes: Backend secret-bearing responses now opt out of cache retention, and Dev commercial readiness now has execution-level regression coverage plus a self-hosted evidence workflow.

## Context

- Related MOC: [[AgentFeed CLI MOC]].
- Related task board: [[Active Tasks]].
- Builds on [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]] and [[Commercial Readiness Hardening - Hosted Deployment Probe and CI API Explicitness 2026-06-02]].

## Current hosted evidence

> [!warning]
> `make commercial-readiness` still fails on the external hosted deployment: `https://agentfeed.dev/` returns HTTP `307` to `/login`; `api.agentfeed.dev` remains unresolved when checked directly. The local cross-repo gate still passed before the hosted smoke failed.

## Problems fixed

1. Backend auth/token endpoints returned raw credentials or session-bearing redirects without explicit `Cache-Control` / `Pragma` no-store headers.
2. Dev `scripts/commercial-readiness.sh` was statically checked but not behaviorally tested for manifest transitions, step order, per-step logs, or failure propagation.
3. Commercial readiness evidence was local-only; there was no manual workflow that could archive the complete release evidence bundle.
4. The browser release smoke was documented separately from the commercial readiness gate, leaving a false-green risk once hosted/OAuth blockers are resolved.

## Contract

- Backend secret-bearing responses set:
  - `Cache-Control: no-store, private`
  - `Pragma: no-cache`
- Covered Backend paths include GitHub callback redirects, CLI session approval-code creation, CLI token exchange, managed ingestion-token creation, and managed ingestion-token rotation.
- Dev commercial readiness required steps now include:
  1. `test-all`
  2. `smoke-hosted-compatibility`
  3. `smoke-e2e`
  4. `smoke-oauth-live`
- Dev commercial readiness manifest exposes `browser_release_smoke_log: smoke-e2e.log`.
- `scripts/test-commercial-readiness-exec.sh` stubs the gate steps and proves success/failure manifest behavior without Docker or hosted credentials.
- `.github/workflows/commercial-readiness.yml` runs the same gate on a self-hosted runner and uploads `commercial-readiness-evidence` even on fail-closed runs.

## Verification evidence

> [!success] Backend focused verification
> `uv run --locked --group dev ruff check app/routers/auth.py app/routers/me.py app/utils/responses.py tests/test_contracts.py` passed.
>
> Focused secret-response tests passed: `6 passed, 276 deselected`.

> [!success] Dev focused verification
> `./scripts/test-commercial-readiness-exec.sh` passed.
>
> `./scripts/test-commercial-readiness-gate.sh` passed.
>
> `./scripts/check-action-pins.sh` passed.

> [!example] Updated commercial gate fail-closed proof
> `AGENTFEED_COMMERCIAL_READINESS_EVIDENCE_DIR=/tmp/agentfeed-commercial-readiness-verify ./scripts/commercial-readiness.sh` ran the local cross-repo gate successfully, then failed closed at hosted Frontend root HTTP `307`.
>
> The resulting manifest included `required_steps: ["test-all", "smoke-hosted-compatibility", "smoke-e2e", "smoke-oauth-live"]`, `browser_release_smoke_log: "smoke-e2e.log"`, `test-all: passed`, and `smoke-hosted-compatibility: failed`.

## Remaining risks

> [!warning]
> The frontend production API compatibility check is still not enabled by default in push CI because `api.agentfeed.dev` is currently DNS-blocked; enabling it now would bind ordinary development CI to the unresolved hosted API. Revisit after DNS/deploy is fixed.

> [!todo]
> CLI production safety still has additional candidates: first-class `agentfeed logout`, atomic local state writes, and an optional human confirmation gate for immediate upload commands.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]
- [[Commercial Readiness Hardening - Hosted Deployment Probe and CI API Explicitness 2026-06-02]]

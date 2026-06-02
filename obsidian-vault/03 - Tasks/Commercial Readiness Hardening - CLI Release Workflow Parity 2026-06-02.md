---
title: Commercial Readiness Hardening - CLI Release Workflow Parity 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/commercial-readiness
  - agentfeed/supply-chain
status: completed
aliases:
  - CLI release workflow parity
  - CLI Node 22 CI parity
---

# CLI release workflow parity

> [!success]
> CLI CI and npm Release workflow now use the same trusted-publishing toolchain assumptions, and tag releases execute the full package quality gate before publish.

## Context

- Related MOC: [[AgentFeed CLI MOC]].
- Related task board: [[Active Tasks]].
- Builds on [[Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02]] and [[Commercial Readiness Hardening - CLI Release Tag Version Gate 2026-06-01]].

## Problem

Two release-readiness gaps remained in the CLI repo:

1. CI used Node.js 20 while Release and trusted-publishing contracts require Node.js 22.14.0 with pinned `npm@11.6.0`.
2. Release workflow ran `build` and `release:preflight`, but did not directly run `prepack`, so tag releases did not re-run the package's build + typecheck + test gate before publishing.

## Contract

1. `.github/workflows/ci.yml` uses `node-version: 22.14.0` and installs pinned `npm@11.6.0` before `npm ci`.
2. `.github/workflows/release.yml` runs `npm run prepack` after full dependency audit and before `release:preflight` / `npm publish`.
3. `scripts/release-preflight.mjs` validates the Release workflow requires `prepack` ordering, not a weaker build-only gate.
4. `tests/release-preflight.test.ts` fails closed if CI drifts back to Node 20 / unpinned npm or Release stops running `prepack`.

## Changes

- CLI `.github/workflows/ci.yml`
  - Changed CI Node version from 20 to 22.14.0.
  - Added pinned npm install before dependency installation.
- CLI `.github/workflows/release.yml`
  - Replaced build-only release step with `npm run prepack`.
- CLI `scripts/release-preflight.mjs`
  - Release workflow validation now requires `npm run prepack` before `release:preflight` and `npm publish`.
- CLI `tests/release-preflight.test.ts`
  - Added red/green coverage for CI toolchain parity and Release `prepack` ordering.

## Verification evidence

> [!example] RED
> `npm test -- tests/release-preflight.test.ts` failed before implementation because CI still used `node-version: 20`, CI did not install pinned npm, and the validator still allowed build-only Release gating.

> [!success] GREEN — focused contract
> `npm test -- tests/release-preflight.test.ts` passed.

> [!success] GREEN — package quality gate
> `npm run prepack` passed: clean build, typecheck, and full Vitest suite (`22` files / `331` tests).

> [!success] GREEN — release/audit gate
> `npm run release:preflight` passed, including trusted publishing workflow validation, tarball dry-run validation, built CLI smoke, and installed package smoke.
>
> `npm audit --audit-level=high` passed with `0` vulnerabilities.

## Remaining risk

> [!warning]
> This closes the CLI release workflow parity gap. It does not resolve the external hosted release blocker: `https://agentfeed.dev/` must stop redirecting to stale `/login`, and `https://api.agentfeed.dev/v1` must be deployed/DNS-ready before default commercial readiness can pass.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02]]
- [[Commercial Readiness Hardening - CLI Release Tag Version Gate 2026-06-01]]
- [[Commercial Readiness Hardening - Hosted Failure Evidence 2026-06-02]]

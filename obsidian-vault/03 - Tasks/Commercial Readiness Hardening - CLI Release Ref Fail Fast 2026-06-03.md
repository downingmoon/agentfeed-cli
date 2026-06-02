---
title: Commercial Readiness Hardening - CLI Release Ref Fail Fast 2026-06-03
aliases:
  - CLI Release Ref Fail Fast
  - Release Tag Version Early Gate
created: 2026-06-03
updated: 2026-06-03
status: done
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/release
  - agentfeed/supply-chain
---

# CLI Release Ref Fail Fast

> [!success] Outcome
> CLI Release workflow now fails fast when manually dispatched from a branch or a tag that does not match `package.json` version, before dependency install, audit, package build, or npm publish.

## Risk

> [!bug] P2 release operations
> `release:preflight` already rejected mismatched Release refs, but it ran late after install/build/test gates. A manual `workflow_dispatch` from `main` would waste CI time and make the operator wait for a failure that can be proven from `package.json` and `GITHUB_REF_*` immediately.

## Changes

- `.github/workflows/release.yml`
  - Added **Verify release tag matches package version** immediately after Node setup.
  - The step reads `package.json`, expects `v${package.version}`, and fails unless GitHub ref type/name are the matching tag.
- `scripts/release-preflight.mjs`
  - Validates the early release-ref guard exists.
  - Validates the guard derives the tag from `package.json` and runs before `npm ci`, audit/build gates, and `npm publish`.
- `tests/release-preflight.test.ts`
  - Locks the new workflow contract and negative cases for missing/late/tag-source drift.

## Verification

> [!success] Targeted gates passed
> - `node --check scripts/release-preflight.mjs`
> - `npm test -- --run tests/release-preflight.test.ts tests/version.test.ts` → 14 tests passed
> - `npm run typecheck`

후속 전체 gate: `agentfeed-dev/scripts/test-all.sh`.

## Related

- [[Commercial Readiness Hardening - CLI Trusted Publishing Enforcement 2026-06-01]]
- [[Commercial Readiness Hardening - CLI Release Workflow Parity 2026-06-02]]
- [[Commercial Readiness Hardening - CLI Release Preflight and Provenance 2026-06-01]]
- [[Active Tasks]]

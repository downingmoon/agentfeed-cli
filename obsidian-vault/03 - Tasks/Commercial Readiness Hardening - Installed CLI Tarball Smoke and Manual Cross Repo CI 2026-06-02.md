---
title: Commercial Readiness Hardening - Installed CLI Tarball Smoke and Manual Cross Repo CI 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - agentfeed/dev-orchestration
  - agentfeed/ci
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Installed CLI tarball smoke and manual cross repo CI
---

# Installed CLI tarball smoke and manual cross repo CI

> [!success]
> Release preflight now proves the npm tarball installs and exposes the `agentfeed` bin, and `agentfeed-dev` now has a manual private cross-repo integration workflow contract.

## Context

- Related release guard: [[Commercial Readiness Hardening - CLI Release Preflight and Provenance 2026-06-01]]
- Related cross-repo gates: [[Commercial Readiness Hardening - Cross Repo CI Gates 2026-06-01]]
- Current integration map: [[Integration - CLI Backend Frontend]]

## Gaps closed

1. **CLI package path was weaker than production install path**
   - Existing preflight executed `node dist/cli/index.js` directly.
   - That proved built source worked, but not that the published package tarball installs and exposes the configured `bin.agentfeed` path.

2. **Cross-repo remote gate was local-only**
   - `agentfeed-dev/scripts/test-all.sh` already exercises CLI, Backend, Frontend, OpenAPI contracts, action pins, and migrations locally.
   - `agentfeed-dev` had no workflow surface to run the same gate remotely.
   - Because all product repos are private, cross-repo checkout needs an explicit read token instead of silently assuming current-repo `GITHUB_TOKEN` can read sibling private repos.

## Changes

### CLI release preflight

- `scripts/release-preflight.mjs`
  - Added `validateInstalledPackageSmokeResult`.
  - Added an actual `npm pack --json --ignore-scripts --pack-destination <tmp>` step.
  - Installs the generated `.tgz` into a temporary project with `npm install --prefix <tmp>/install <tarball>`.
  - Executes the installed `node_modules/.bin/agentfeed --help` and `--version`.
  - Validates output against the same CLI smoke/version contract.
- `tests/release-preflight.test.ts`
  - RED/GREEN unit coverage for installed package smoke result and direct-bin requirement.
- `tests/version.test.ts` and `README.md`
  - Document/source-guard the installed tarball smoke expectation.

### dev orchestration remote gate

- `.github/workflows/cross-repo-integration.yml`
  - Manual `workflow_dispatch` only.
  - Requires `AGENTFEED_CI_REPO_READ_TOKEN` for private sibling repo checkouts.
  - Checks out:
    - `downingmoon/agentfeed-cli@main` → `AgentFeed-CLI`
    - `downingmoon/agentfeed-frontend@main` → `agentfeed-frontend`
    - `downingmoon/agentfeed-backend@master` → `agentfeed-backend`
  - Installs Node/Python dependencies, then runs `scripts/test-all.sh`.
- `scripts/ci-prepare.sh`
  - Installs CLI/frontend npm dependencies and backend `uv` dependencies in the expected sibling layout.
- `scripts/test-ci-integration-workflow.sh`
  - Locks the workflow shape, private repo token requirement, checkout paths/branches, setup script, and `test-all` invocation.
- `scripts/check-action-pins.sh`
  - Now checks `agentfeed-dev/.github/workflows` in addition to the product repos.
- `scripts/test-all.sh`
  - Includes the new workflow contract test.
- `README.md`
  - Documents why the workflow is manual-only until the private cross-repo read token is configured.

## Verification

> [!example] RED
> `npm test -- --run tests/release-preflight.test.ts -t 'installed tarball CLI smoke'` failed because `validateInstalledPackageSmokeResult` did not exist.

> [!example] RED
> `bash scripts/test-ci-integration-workflow.sh` failed because `.github/workflows/cross-repo-integration.yml` did not exist.

> [!success] GREEN
> `npm test -- --run tests/release-preflight.test.ts tests/version.test.ts && npm run build && npm run release:preflight` passed with 14 tests and installed package smoke output.

> [!success] GREEN
> `npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high` passed: 21 files / 325 tests, typecheck, installed tarball preflight, and 0 vulnerabilities.

> [!success] GREEN
> `bash scripts/test-ci-integration-workflow.sh && ./scripts/check-action-pins.sh` passed.

> [!success] GREEN
> `./scripts/ci-prepare.sh && ./scripts/test-all.sh` passed: dependency setup, OpenAPI 70 operations, CLI 325 tests, frontend CI/audit, backend ruff/285 pytest, and Alembic offline migration chain.

## Remaining risk

> [!warning]
> The new cross-repo workflow is intentionally manual-only because the GitHub repos are private and `agentfeed-dev` currently has no `AGENTFEED_CI_REPO_READ_TOKEN` secret configured. Configure that secret before using the workflow as a branch-protection or release gate.

> [!todo]
> Next commercial hardening candidates: credentialed hosted OAuth live smoke lane, non-interactive frontend↔backend runtime smoke, and explicit API compatibility metadata handshake.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Integration - CLI Backend Frontend#2026-06-02 installed CLI tarball smoke and manual cross-repo CI]]

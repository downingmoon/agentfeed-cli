---
title: Commercial Readiness Hardening - Metadata Review URL Trust 2026-06-03
aliases:
  - Metadata Review URL Trust
  - Review Base URL Contract
created: 2026-06-03
updated: 2026-06-03
status: done
tags:
  - agentfeed/commercial-readiness
  - agentfeed/integration
  - agentfeed/cli
  - agentfeed/api-contract
---

# Metadata Review URL Trust

> [!summary]
> `/v1/metadata` now carries the frontend review origin as `review_base_url`, and the CLI uses that metadata as the primary trust source before accepting/copying/opening private review URLs.

## Why

The previous split-host support depended on a CLI-side environment allowlist (`AGENTFEED_REVIEW_BASE_URL`) or hostname heuristics. That was useful for local/dev setups, but production-grade CLI/API/Frontend alignment should be contract-driven: the Backend knows the configured Frontend origin and should advertise it through the compatibility metadata handshake.

## Change

- Backend `/v1/metadata` exposes `review_base_url` from `FRONTEND_URL` without a trailing slash.
- Backend ingest review URLs also normalize `FRONTEND_URL.rstrip('/')` to avoid double-slash drift.
- CLI contract version moved to `2026-06-03` and requires metadata `review_base_url` to be a trusted origin.
- CLI upload parsing, duplicate-ingest reconciliation, cached upload reuse, JSON/human handoff, and `agentfeed open` trust checks all accept metadata-derived `review_base_url`.
- CLI still preserves the older safety fallbacks:
  - `AGENTFEED_REVIEW_BASE_URL` explicit local override
  - local API → local review host heuristic
  - `agentfeed.dev` API → non-`api.*` AgentFeed review host heuristic
  - exact-host fallback for non-AgentFeed deployments
- Frontend compatibility checks and Dev OpenAPI gates now require `review_base_url` in metadata.

## Verification evidence

> [!success]
> Initial targeted gates passed after implementation.

- CLI: `npm run typecheck` passed.
- CLI: `npm test -- --run` passed: 23 files / 372 tests.
- Backend: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k "ingest_response or api_metadata or metadata_route"` passed: 10 tests.
- Frontend: `npm run test:contracts` passed.
- Frontend: `npm run lint` passed.
- Dev: `node scripts/check-openapi-contract.mjs` passed.
- Dev integrated gate: `/Users/downing/PersonalProjects/agentfeed-dev/scripts/test-all.sh` passed, including CLI release preflight, Frontend CI/build, Backend 345-test suite, and Alembic offline migration chain.

## Remaining release blocker

> [!warning]
> Hosted release readiness is still blocked externally until `api.agentfeed.dev` DNS/deployment and `https://agentfeed.dev/` root freshness are resolved. This change is local-contract ready, but hosted smoke will keep failing until deployment catches up.

## Related

- [[Commercial Readiness Hardening - API Compatibility Metadata Handshake 2026-06-02]]
- [[Commercial Readiness Hardening - CLI Split Review Host Allowlist 2026-06-02]]
- [[Commercial Readiness Hardening - Frontend Local DNSless CI Guard 2026-06-03]]
- [[Active Tasks]]

---
title: CLI Auth Exchange Rotation Pair Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - frontend
  - backend
  - contract
  - cli-auth
  - audit
status: done
---

# CLI Auth Exchange Rotation Pair Contract 2026-06-11

## Context

CLI auth exchange can rotate an existing ingestion token. In that case `rotated_from` identifies the previous token and `rotated_at` records the revocation timestamp.

Backend route behavior already emits those two fields together when rotation happens, but the schema and both client parsers could accept partial metadata. That creates ambiguous token lineage/audit state: a token could appear to have a source without a timestamp, or a timestamp without the source token.

## Changed

- Backend `CliAuthExchangeResponse` now rejects partial rotation metadata with a Pydantic `model_validator`.
- Backend focused schema contract test added in `tests/test_cli_auth_exchange_schema_contracts.py`.
- CLI `parseCliAuthExchangeResult` now fails closed unless `rotated_from` and `rotated_at` are both absent/null or both present.
- CLI focused parser contract test added in `tests/cli-auth-exchange-response-contract.test.ts`.
- Frontend `normalizeCliAuthExchangeResult` now enforces the same pair invariant.
- Frontend CLI auth contract test now covers both partial pair failure modes.

## Verification

> [!success]
> Red/green and full local verification passed across CLI, Frontend, and Backend. No server deployment was performed.

- Red checks:
  - CLI targeted test failed before parser fix because partial rotation metadata resolved instead of rejecting.
  - Frontend `npm test` failed before parser fix because malformed exchange response did not fail closed.
  - Backend schema test failed before validator because partial payloads did not raise `ValidationError`.
- CLI full suite/build: `npm test && npm run build` → 40 files / 619 tests passed.
- Frontend full contract/type/build: `npm test && npm run lint && NEXT_PUBLIC_API_URL=https://api.example.com npm run build` passed.
- Backend full suite: `uv run pytest -q` → 440 passed, 1 existing Starlette/httpx deprecation warning.
- Hygiene: `git diff --check` passed in all touched repos.
- Size check: new focused tests are under 250 pure LOC; inherited oversized CLI `tests/api-hook.test.ts` has no final diff.
- LSP caveat: TypeScript and Python LSP diagnostics could not run because `typescript-language-server` and `basedpyright-langserver` are not installed locally; compiler/build/test gates passed.

## Follow-up

- Review whether Backend ingest preview API should be explicitly documented as CLI-only or modeled in Frontend shared API contracts.
- Continue converting new regression coverage into focused test files instead of appending to inherited oversized suites.

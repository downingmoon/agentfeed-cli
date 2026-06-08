---
title: CLI Ingest Status Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/contract
  - project/tasks
aliases:
  - CLI token status contract guard
---

# CLI Ingest Status Contract Guard 2026-06-08

## 결정

`GET /v1/ingest/status`는 CLI `status`, `doctor`, publish preflight에서 token validity와 expiry를 판단하는 핵심 계약이다. Backend schema는 token lifecycle/user identity payload를 명시하지만, CLI는 기존에 HTTP 200이면 응답 본문이 누락되어도 `ok: true`로 취급할 수 있었다.

> [!success] 완료
> CLI `checkIngestionToken`이 `/v1/ingest/status` 응답을 Backend schema 기준으로 검증하도록 fail-closed 처리했다. malformed 200 응답은 `ok: false`와 명확한 error message가 되며, Dev OpenAPI contract gate도 status response의 token/user lifecycle 필드를 감시한다.

## 변경 범위

- CLI
  - `IngestionTokenStatus` 타입을 required status payload 기준으로 강화.
  - `/v1/ingest/status` 전용 parser 추가.
  - `user.id`, `token.id`, `token.name`, `token.created_at`, `token.expires_at`, `token.expires_in_seconds`, `token.expiring_soon` 누락/타입 오류를 unhealthy로 처리.
  - `token.created_at`, `token.expires_at`, optional `token.last_used_at` date parsing 검증.
  - malformed status response regression tests 추가.
- Dev contract
  - OpenAPI gate의 CLI token status response field matrix를 Backend schema에 맞춰 확장.

## Evidence

- CLI: `npm run typecheck` → passed.
- CLI: `npx vitest run tests/api-hook.test.ts --reporter=verbose` → `98 passed`.
- CLI: `npx vitest run tests/cli-status-doctor.test.ts --reporter=verbose --hookTimeout=30000` → `37 passed`.
- Dev: `node scripts/check-openapi-contract.mjs` → OpenAPI contract gate passed, schema field contracts `138 fields across 26 operations`.
- Backend: `uv run pytest -q tests/test_contracts.py -k "ingest_status_returns_token_lifecycle_metadata or route_response_models_use_explicit_contract_schemas"` → `1 passed, 371 deselected`.
- Backend: `uv run ruff check app/schemas/ingestion.py app/routers/ingest.py tests/test_contracts.py` → All checks passed.

## 후행 과제

- [ ] 개인 서버 live smoke에서 malformed status response를 만들지는 않는다. 대신 local contract tests와 Dev OpenAPI gate를 회귀 기준으로 유지한다.
- [ ] token status response에 신규 lifecycle field가 추가되면 CLI parser와 Dev gate를 같은 commit 범위에서 함께 갱신한다.

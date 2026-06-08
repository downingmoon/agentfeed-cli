---
title: Frontend Token Response Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/contract
  - project/tasks
aliases:
  - Settings token response guard
---

# Frontend Token Response Guard 2026-06-08

## 결정

Settings의 ingestion token list/create/rotate surface는 token secret과 lifecycle metadata를 직접 보여주는 민감한 UI다. Backend schema와 Dev OpenAPI gate는 필수 필드를 정의하지만, Frontend API boundary는 기존에 generic type만 믿고 raw `data`를 그대로 반환했다. 이 경우 malformed 200 응답이 Settings UI에서 `undefined` secret/expiry로 이어질 수 있다.

> [!success] 완료
> Frontend `me.ingestionTokens`, `me.createIngestionToken`, `me.rotateIngestionToken` 응답을 runtime normalizer로 통과시킨다. 필수 `id/name/token/created_at/expires_at/token_expires_at/rotated_from/rotated_at` 또는 날짜 형식이 깨지면 `ApiError(502)`로 fail-closed 처리한다. Dev OpenAPI gate도 같은 token lifecycle response fields를 감시한다.

## 변경 범위

- Frontend
  - token list item runtime guard 추가.
  - created token one-time secret runtime guard 추가.
  - rotated token lifecycle/user payload runtime guard 추가.
  - `ApiRotatedIngestionToken.token_expires_at`을 Backend schema 기준 required로 승격.
  - malformed token list/create/rotate response contract tests 추가.
- Dev contract
  - `/v1/me/ingestion-tokens` list/create schema field checks 보강.
  - `/v1/me/ingestion-tokens/{token_id}/rotate` response/schema field checks 추가.

## Evidence

- Frontend: `npm run lint` → passed.
- Frontend: `npm run test:contracts` → passed.
- Dev: `node scripts/check-openapi-contract.mjs` → OpenAPI contract gate passed, schema field contracts `153 fields across 27 operations`.
- Backend: `uv run pytest -q tests/test_contracts.py -k "rotate_managed_ingestion_token_uses_existing_name_by_default or create_ingestion_token or list_ingestion_tokens or route_response_models_use_explicit_contract_schemas"` → `4 passed, 368 deselected`.
- Backend: `uv run ruff check app/schemas/ingestion.py app/routers/me.py tests/test_contracts.py` → All checks passed.

## 후행 과제

- [ ] Settings에 신규 token lifecycle field를 노출하게 되면 Frontend normalizer, Dev OpenAPI gate, Backend schema test를 같은 변경 범위에서 갱신한다.
- [ ] 사용자가 실제 token create/rotate UI를 다시 smoke할 때 one-time secret panel이 malformed response를 에러 배너로 처리하는지 확인한다.

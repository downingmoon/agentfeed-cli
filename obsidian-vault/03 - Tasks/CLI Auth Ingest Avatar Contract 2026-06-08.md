---
title: CLI Auth Ingest Avatar Contract 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/avatar
  - agentfeed/contract
  - agentfeed/cli
  - agentfeed/backend
  - project/tasks
aliases:
  - CLI auth avatar contract
---

# CLI Auth Ingest Avatar Contract 2026-06-08

## 결정

[[Frontend GitHub Avatar Coverage 2026-06-08]]와 [[User Avatar Residual Coverage 2026-06-08]] 이후에도 CLI/API identity payload 일부가 GitHub `avatar_url`을 보존하지 않았다. 이 값은 터미널에서 직접 렌더링하지 않더라도, browser login으로 저장된 credential metadata와 token status 계약에서 사용자 identity를 일관되게 유지하기 위해 API → CLI 순서로 보존해야 한다.

> [!success] 완료
> Backend `/v1/auth/cli/sessions/{session_id}/exchange`, `/v1/ingest/status`, `/v1/me/ingestion-tokens/{id}/rotate` 응답 user payload가 `avatar_url`을 포함하도록 보강했다. CLI는 exchange parser와 saved credential normalizer에서 `avatar_url`을 보존한다. Dev OpenAPI contract와 OAuth smoke도 같은 필드를 감시한다.

## 변경 범위

- Backend
  - `CliAuthExchangeUser.avatar_url` 추가.
  - `IngestionStatusUser.avatar_url` 추가.
  - CLI browser exchange, ingestion status, managed token rotate response에 `avatar_url` 포함.
- CLI
  - `AgentFeedCredentials.user.avatar_url` 및 `CliAuthExchangeResult.user.avatar_url` 타입 확장.
  - browser login exchange parser가 `avatar_url`을 fail-closed로 검증/보존.
  - saved credentials loader가 user avatar metadata를 보존.
- Dev contract
  - OpenAPI schema gate가 CLI exchange/status `data.user.avatar_url`을 요구.
  - mocked OAuth smoke가 GitHub avatar를 exchange/status까지 검증.

## TDD evidence

### RED

- Backend targeted pytest: 5 failures, 모두 `KeyError: 'avatar_url'` 또는 expected object diff.
- CLI targeted vitest: 3 failures, exchange/saved credential `avatar_url`이 `undefined`.
- Dev OpenAPI contract: exchange/status response schema에서 `data.user.avatar_url is missing`.

### GREEN

- Backend targeted pytest: `5 passed, 365 deselected`.
- CLI targeted vitest: `4 passed, 121 skipped`.
- Dev OpenAPI contract: passed, schema field contracts `129 fields across 26 operations`.

### Broader verification

- Backend: `uv run ruff check . && uv run pytest tests/test_contracts.py -q` → `370 passed, 1 warning`.
- CLI: `npm test && npm run typecheck` → `27 passed`, `541 passed`, typecheck passed.
- Dev: `bash scripts/test-all.sh` → passed across CLI release preflight, Frontend CI/build, Backend pytest/ruff/Alembic offline chain.
- OAuth smoke: `bash scripts/smoke-oauth-contract.sh` → `OAUTH_CONTRACT_SMOKE_PASSED` after local Docker Desktop became ready.

## 후행 과제

- [ ] 실제 사용자 브라우저에서 GitHub credential 입력까지 포함한 live login을 한 번 더 수행한다.
- [ ] production domain이 생기면 hosted compatibility smoke에도 avatar contract evidence를 포함한다.

## 2026-06-08 추가: CLI auth exchange 필수 필드 fail-closed

`avatar_url` 보존 이후 계약을 다시 비교하면서 CLI browser login exchange parser가 Backend schema보다 느슨한 필드를 허용하던 gap을 확인했다. Backend 기준 `token_id`, `token_expires_at`, `user.id`, `user.display_name`은 필수인데, CLI는 일부 필드를 optional로 저장할 수 있었다.

> [!success] 완료
> CLI는 `/v1/auth/cli/sessions/{session_id}/exchange` 응답에서 `token_id`, `token_expires_at`, `user.id`, `user.display_name`이 빠진 경우 credential 저장 전에 `API_RESPONSE_INVALID`로 실패한다. Dev OpenAPI gate도 `data.user.display_name` 필수 계약을 감시한다.

### 변경 범위

- CLI
  - `CliAuthExchangeResult.token_id`, `token_expires_at`, `user`, `user.id`, `user.display_name`을 required 타입으로 승격.
  - browser login exchange parser가 필수 token binding/user identity 필드 누락을 fail-closed 처리.
  - browser login save/no-save credential path가 nullable fallback 없이 required `token_id`를 사용.
  - browser login/rotate 테스트 fixture를 Backend 응답 계약에 맞게 보강.
- Dev contract
  - OpenAPI schema gate에 CLI auth exchange `data.user.display_name` required string 필드 추가.

### Evidence

- CLI: `npm run typecheck` → passed.
- CLI: `npx vitest run tests/api-hook.test.ts --reporter=verbose` → `93 passed`.
- CLI: `npx vitest run tests/cli-status-doctor.test.ts --reporter=verbose --hookTimeout=30000` → `37 passed`.
- Dev: `node scripts/check-openapi-contract.mjs` → OpenAPI contract gate passed, schema field contracts `131 fields across 26 operations`.
- Backend: `uv run pytest -q tests/test_contracts.py -k "route_response_models_use_explicit_contract_schemas or cli_auth"` → `12 passed, 360 deselected`.
- Backend: `uv run ruff check app/schemas/auth.py tests/test_contracts.py` → All checks passed.

### 후행 과제

- [ ] 실제 GitHub OAuth login으로 personal server auth exchange 응답에 `token_id`/`token_expires_at`/`display_name`/`avatar_url`이 모두 저장되는지 smoke한다.

---
title: Frontend Request Strict Contract 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - backend
  - frontend
  - cli
  - contract
status: done
---

# Frontend Request Strict Contract 2026-06-08

## 목적

[[Backend Ingest Strict Contract 2026-06-08]]의 후행 과제였던 Frontend/CLI mutating request schema extra-field 정책을 점검하고, 계약 밖 필드를 Backend가 조용히 무시하지 않도록 fail-closed로 잠근다.

## 변경

### Backend request schemas

다음 request model에 `extra="forbid"`를 적용했다.

- CLI auth: `CreateCliAuthSessionRequest`, `ExchangeCliAuthSessionRequest`, `ApproveCliAuthSessionRequest`
- ingestion token lifecycle: `CreateIngestionTokenRequest`, `RotateIngestionTokenRequest`
- project forms: `CreateProjectRequest`, `UpdateProjectRequest`
- worklog forms: `CreateWorklogRequest`, `UpdateWorklogRequest`, `PublishWorklogRequest`, `UnpublishWorklogRequest`, `ResolvePrivacyFindingRequest`
- profile/username forms: `UpdateProfileRequest`, `SetUsernameRequest`
- social/moderation forms: `CreateCommentRequest`, `ReportRequest`, `UpdateModerationReportStatusRequest`
- settings forms: `UpdatePrivacySettingsRequest`, `UpdateNotificationSettingsRequest`

### Backend tests

- `tests/test_contracts.py`
  - `test_frontend_and_cli_request_schemas_fail_closed_for_unknown_fields` 추가.
  - 대표 payload는 정상 통과하고, `unexpected_contract_field`가 붙으면 모두 `PydanticValidationError`를 발생시키는지 검증한다.

### Dev contract gate

- `scripts/check-openapi-contract.mjs`
  - 모든 `REQUEST_BODY_FIELD_CONTRACTS` 대상 request body root schema가 `additionalProperties=false`를 명시하는지 검사한다.
- `scripts/test-all.sh`
  - `additionalProperties=false` request-body guard가 빠지지 않도록 static grep을 추가했다.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --python 3.12 --locked --group dev ruff check \
  app/schemas/project.py app/schemas/worklog.py app/schemas/user.py \
  app/schemas/social.py app/schemas/settings.py app/schemas/moderation.py \
  app/schemas/ingestion.py app/routers/auth.py tests/test_contracts.py
uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q \
  -k 'frontend_and_cli_request_schemas_fail_closed_for_unknown_fields or project_visibility_schema_rejects_unknown_values or worklog_visibility_and_metric_schemas_are_bounded or privacy_settings_visibility_defaults_reject_unknown_values or auth_cli_user_code'

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash -n scripts/test-all.sh scripts/check-openapi-contract.mjs
```

결과:

- Backend ruff: pass
- Backend targeted pytest: `3 passed, 369 deselected`
- Dev OpenAPI gate: pass
- Request body field contracts checked: `232 fields across 22 operations with additionalProperties=false`
- Forbidden request body fields checked: `4 fields across 2 operations`
- diff whitespace check: pass

## 후행 과제

> [!note]
> 이번 작업은 client-origin request body root를 strict 처리했다. 오래된 저장 데이터/response body 호환성은 별도 문제이므로 건드리지 않았다.

- [ ] response schema strictness는 legacy stored JSON normalization 정책이 정해진 뒤 별도 audit에서 검토한다.
- [ ] 신규 mutating endpoint가 추가되면 Dev OpenAPI `REQUEST_BODY_FIELD_CONTRACTS`에 포함하고 `additionalProperties=false` evidence를 확인한다.


## 2026-06-08 후속 보강 — Frontend mutating action request bodies

> [!success]
> comment/report/privacy resolution/publish/unpublish처럼 UI에서 자주 발생하는 mutating action도 Backend strict schema와 Dev OpenAPI gate가 같은 필드명을 검증하도록 추가로 잠갔다.

### 추가로 잠근 request body 계약

- `POST /v1/worklogs/{worklog_id}/comments` → `body`
- `POST /v1/worklogs/{worklog_id}/privacy-findings/{finding_id}/resolve` → `resolution` (`ignored`, `redacted`, `removed`)
- `POST /v1/worklogs/{worklog_id}/publish` → `visibility` (`private`, `unlisted`, `public`)
- `POST /v1/worklogs/{worklog_id}/unpublish` → `visibility` (`private`, `unlisted`)
- `POST /v1/worklogs/{worklog_id}/report` → `reason`, `description`
- `POST /v1/comments/{comment_id}/report` → `reason`, `description`

### Frontend client exact-body regression

- `src/lib/api-contract.test.ts`에 `assertWorklogMutationBodyContracts`를 추가했다.
- worklog/comment id에 `/`가 포함되어도 path segment가 `%2F`로 안전하게 encode되는지 확인한다.
- Backend 컬럼/API 기준 필드명만 전송하는지 exact JSON body로 검증한다.

### 최신 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs

cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
  AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 npm run build

cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest -q tests/test_contracts.py \
  -k "request_schemas_fail_closed or worklog_publish_visibility_request_contracts or social_contracts_reject_invalid_request_values"
uv run ruff check .
```

결과:

- Dev OpenAPI gate: pass, `232 fields across 22 operations with additionalProperties=false`
- Frontend contract tests: pass
- Frontend typecheck/lint: pass
- Frontend production build: pass
- Backend targeted pytest: `1 passed, 371 deselected`
- Backend ruff: pass


## 2026-06-08 후속 보강 — Ingestion token lifecycle request bodies

> [!success]
> Settings의 token create/rotate/revoke 경로도 Backend strict schema와 Frontend exact request contract가 같은 route/body를 사용하도록 보강했다. 특히 rotate는 Backend가 optional `name` request body를 지원하므로 Dev OpenAPI gate에서 `additionalProperties=false`와 `bodyRequired=false`를 함께 확인한다.

### 추가로 잠근 계약

- `POST /v1/me/ingestion-tokens/{token_id}/rotate`
  - `name?: string | null`
  - request body optional
  - root schema `additionalProperties=false`
- Frontend exact request regression
  - `me.createIngestionToken('CLI: MacBook')` → `POST /v1/me/ingestion-tokens`, body `{ "name": "CLI: MacBook" }`
  - `me.rotateIngestionToken('token/id')` → `POST /v1/me/ingestion-tokens/token%2Fid/rotate`, body `{}`
  - `me.revokeIngestionToken('token/id')` → `DELETE /v1/me/ingestion-tokens/token%2Fid`, no body

### 최신 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs

cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest -q tests/test_contracts.py \
  -k "frontend_and_cli_request_schemas_fail_closed_for_unknown_fields or rotate_managed_ingestion_token_uses_existing_name_by_default"
uv run ruff check .
```

결과:

- Dev OpenAPI gate: pass, `232 fields across 22 operations with additionalProperties=false`
- Frontend contract tests: pass
- Frontend typecheck/lint: pass
- Backend targeted pytest: `2 passed, 370 deselected`
- Backend ruff: pass

## 남은 리스크

> [!note]
> 이번 보강은 기존 기능의 계약 누락을 막는 회귀 가드이며 신규 기능은 추가하지 않았다.

- [ ] 신규 mutating endpoint가 추가될 때 `CLIENT_ENDPOINTS`, `REQUEST_BODY_FIELD_CONTRACTS`, Frontend exact-body test 중 어느 하나라도 빠지지 않도록 PR checklist/runbook에 반영한다.

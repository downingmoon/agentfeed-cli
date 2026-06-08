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
- Request body field contracts checked: `223 fields across 15 operations with additionalProperties=false`
- Forbidden request body fields checked: `4 fields across 2 operations`
- diff whitespace check: pass

## 후행 과제

> [!note]
> 이번 작업은 client-origin request body root를 strict 처리했다. 오래된 저장 데이터/response body 호환성은 별도 문제이므로 건드리지 않았다.

- [ ] response schema strictness는 legacy stored JSON normalization 정책이 정해진 뒤 별도 audit에서 검토한다.
- [ ] 신규 mutating endpoint가 추가되면 Dev OpenAPI `REQUEST_BODY_FIELD_CONTRACTS`에 포함하고 `additionalProperties=false` evidence를 확인한다.

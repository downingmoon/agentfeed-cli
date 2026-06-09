---
title: Cross Repo ErrorResponse Contract Gate 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - frontend
  - cli
  - api-contract
  - error-response
  - openapi
status: done
related:
  - "[[CLI ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[Frontend ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Cross Repo ErrorResponse Contract Gate 2026-06-09

## 결론

CLI/Frontend가 non-OK API 응답을 strict `ErrorResponse`로 파싱하게 된 뒤, Backend OpenAPI와 런타임의 기본 422/HTTPException 오류 경로가 같은 계약을 보장하도록 맞췄다.

> [!success]
> Backend runtime, Backend OpenAPI, CLI parser, Frontend parser, Dev cross-repo gate가 모두 `{ error: { code, message, details } }` 오류 envelope를 기준으로 정렬됐다.

## 발견한 문제

Dev OpenAPI gate는 기존에 deprecated `/v1/ingest/token/rotate`의 403 한 건만 ErrorResponse로 검사했다.

하지만 Backend OpenAPI에는 client-facing endpoint 대부분에 FastAPI 기본 `422 HTTPValidationError`가 자동 선언되어 있었다. 이 상태에서는:

- CLI/Frontend는 strict ErrorResponse만 허용
- Backend OpenAPI는 `{ detail: [...] }` 기본 validation error를 선언
- 런타임 `RequestValidationError`도 기본 `{ detail: [...] }` 응답 가능

즉, 실제 strict client 기준으로 422 오류 경로가 계약 불일치였다.

## 수정 사항

### Backend

- `RequestValidationError` handler 추가
  - `VALIDATION_ERROR`
  - message: `Invalid request.`
  - details: `{ errors: [{ field, message, type }] }`
- `HTTPException` handler 추가
  - code: `HTTP_<status>`
  - string detail은 user-safe message로 사용
  - non-string detail은 `details.detail`에 보관
- OpenAPI override 추가
  - 모든 4xx/5xx JSON response schema를 `#/components/schemas/ErrorResponse`로 통일
- contract test 추가
  - `/v1/feed?limit=not-a-number` runtime 422 envelope 검증
  - `/v1/search?q=a&type=all` HTTPException 422 envelope 검증
  - `/v1/feed`, `/v1/search` OpenAPI 422 schema가 ErrorResponse ref인지 검증

### Dev

- `scripts/check-openapi-contract.mjs`에 strict client JSON error response 자동 검사 추가
- `CLIENT_ENDPOINTS`의 모든 선언된 JSON 4xx/5xx response가 ErrorResponse 필드 계약을 만족하는지 검사
- README와 `scripts/test-all.sh` guard 문구 업데이트

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --locked --group dev ruff check app/exceptions.py app/main.py tests/test_contracts.py
uv run --locked --group dev pytest
```

- 결과: ruff 통과
- 결과: `427 passed`, 1 warning (`TestClient` deprecation)

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- 결과: `AgentFeed OpenAPI contract gate passed.`
- Strict client JSON error responses checked: 68

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
bash scripts/test-all.sh
```

- 결과: 통과
- 포함 확인:
  - CLI tests/typecheck/release preflight/audit
  - Frontend CI/typecheck/contract tests/mock compatibility/build/audit
  - Backend ruff/tests/alembic offline migration chain
  - Dev workflow/API-base/OpenAPI/action-pin gates

## 배포 여부

> [!note]
> 서버/인프라/CICD 작업은 보류 조건에 따라 건드리지 않았고, 서버 배포도 실시하지 않았다.

## Follow-up

- [ ] `app/main.py`와 `tests/test_contracts.py`는 기존부터 큰 파일이므로, 별도 refactor pass에서 OpenAPI/error-boundary 테스트를 전용 파일로 분리 검토
- [ ] `HTTPException` code를 `HTTP_<status>`보다 도메인별 code로 점진 정규화할지 검토
- [ ] OpenAPI에 미선언된 middleware-origin 오류(예: CSRF 403, payload 413, rate-limit 429)도 client contract matrix에서 명시적으로 검사할지 검토

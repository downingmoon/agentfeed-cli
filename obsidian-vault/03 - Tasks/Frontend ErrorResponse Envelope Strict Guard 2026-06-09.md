---
title: Frontend ErrorResponse Envelope Strict Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - api-contract
  - error-response
  - fail-closed
status: done
related:
  - "[[CLI ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[Frontend OkResponse Strict Payload Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend ErrorResponse Envelope Strict Guard 2026-06-09

## 결론

Frontend `apiFetch`의 non-OK 응답 처리도 Backend `ErrorResponse` / `ErrorDetail` 계약과 동일하게 fail-closed로 강화했다.

> [!success]
> 이제 Frontend는 API 오류 응답이 `{ error: { code, message, details } }` 형태이고 추가 필드가 없을 때만 정상 오류로 분류한다. malformed 401 응답은 auth-expired 이벤트를 내지 않고 502 contract error로 처리한다.

## Backend 기준 계약

Backend 기준은 `/Users/downing/PersonalProjects/agentfeed-backend/app/schemas/common.py`이다.

- `ErrorResponse`: 루트 필드는 `error`만 허용
- `ErrorDetail`: `code`, `message`, `details` 필수, 추가 필드 금지

## 수정 전 문제

Frontend `apiFetch`는 non-OK 응답에서 body를 문자열로만 읽고 바로 `new ApiError(res.status, body)`로 넘겼다.

문제점:

- `{ error: ... }` 루트 외 추가 필드가 있어도 통과
- `error.details` 누락 같은 Backend 계약 drift가 감지되지 않음
- malformed 401에서도 `dispatchAuthError()`가 먼저 실행되어 세션 만료 UI가 잘못 뜰 수 있음

## 변경 사항

- `parseApiErrorEnvelope(body)` 추가
  - JSON parse 실패는 `AgentFeed API error response contract mismatch`로 변환
  - 루트 필드는 `error`만 허용
  - `error` 내부 필드는 `code`, `message`, `details`만 허용
  - `code` / `message`는 non-empty string
  - `details`는 object
- `ApiError`에 진단용 API error metadata 추가
  - `apiCode`
  - `apiErrorMessage`
  - `apiDetails`
- `apiFetch` non-OK 경로에서 error envelope를 먼저 검증한 뒤, 유효한 오류일 때만 401 auth event를 발생시킴
- contract test에서 malformed 401 error envelope가 502로 실패하고 auth event를 내지 않는지 고정

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm run test:contracts
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build
```

- 결과: 모두 통과

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- 결과: `AgentFeed OpenAPI contract gate passed.`
- OpenAPI operations checked: 75
- Client contracts checked: 70
- Response field contracts checked: 40
- Error response field contracts checked: 4 fields across 1 operations

## 배포 여부

> [!note]
> 이번 pass는 Frontend/API contract hardening 작업이며, 서버 배포는 실시하지 않았다.

## Follow-up

- [ ] `ApiError.apiCode` / `apiDetails`를 사용자 액션별 copy에 더 정밀하게 사용할지 검토
- [ ] Dev OpenAPI gate가 Frontend error response parser의 허용 필드 목록 drift까지 직접 감지하도록 확장할지 검토
- [ ] non-JSON gateway/proxy 오류에 대해 사용자가 이해할 수 있는 별도 운영 장애 메시지를 둘지 검토

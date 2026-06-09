---
title: CLI ErrorResponse Envelope Strict Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - cli
  - api-contract
  - error-response
  - fail-closed
status: done
related:
  - "[[CLI DataResponse Envelope Strict Guard 2026-06-09]]"
  - "[[Frontend OkResponse Strict Payload Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# CLI ErrorResponse Envelope Strict Guard 2026-06-09

## 결론

CLI가 Backend의 `ErrorResponse` / `ErrorDetail` 계약과 어긋난 오류 응답을 더 이상 관대하게 해석하지 않도록 수정했다.

> [!success]
> `error` 루트 envelope, `code`, `message`, `details` 필드가 모두 정확히 맞는 경우에만 API 오류로 처리한다. 필드 누락이나 추가 필드가 있으면 `API_RESPONSE_INVALID`로 실패시킨다.

## Backend 기준 계약

Backend 기준은 `/Users/downing/PersonalProjects/agentfeed-backend/app/schemas/common.py`이다.

- `ErrorDetail`
  - `model_config = ConfigDict(extra="forbid")`
  - 필수 필드: `code`, `message`, `details`
- `ErrorResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 필수 필드: `error`

Backend 계약 테스트도 아래 drift를 invalid로 본다.

- `ErrorDetail`에서 `details` 누락
- `ErrorDetail`에 `debug` 같은 추가 필드 존재
- `ErrorResponse` 루트에 `debug` 같은 추가 필드 존재

## 수정 전 문제

기존 CLI는 non-OK 응답에서 다음 형태의 관대한 cast를 사용했다.

```ts
const api = data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
```

이 때문에 아래 문제가 있었다.

- 루트 추가 필드가 있어도 통과 가능
- `error` 내부 추가 필드가 있어도 통과 가능
- `details` 누락 상태에서도 fallback message로 진행 가능
- Backend 계약 drift가 실제 사용자 오류 경로에서 조용히 숨겨질 수 있음

## 변경 사항

### CLI parser

`src/api/client.ts`에 `parseApiErrorEnvelope()`를 추가했다.

- 루트 필드 집합은 `error`만 허용
- `error` 내부 필드 집합은 `code`, `message`, `details`만 허용
- `code` / `message`는 non-empty string이어야 함
- `details`는 record여야 함
- malformed error response는 `AgentFeedApiError(502, "API_RESPONSE_INVALID", ...)`로 변환

### upload 안전성

`publish` / `share` upload 경로에서는 malformed error response 발생 시 로컬 draft를 삭제하거나 uploaded 처리하지 않고 pending 상태로 유지한다.

### 테스트 fixture 정렬

CLI 테스트의 정상 error mock을 Backend 계약 형태로 정렬했다.

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": {}
  }
}
```

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- tests/api-hook.test.ts
```

- 결과: `132 passed`

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run typecheck && npm run build
npm test -- --testTimeout=60000
```

- 결과: typecheck/build 성공
- 결과: `28 passed`, `591 passed`
- 참고: 기본 `npm test` 1회는 전체 병렬 실행 중 2개 파일이 20초 제한으로 timeout 되었고, 해당 파일 단독 재실행 및 60초 timeout 전체 재실행은 통과했다.

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
> 이번 pass는 CLI/API contract hardening 작업이며, 서버 배포는 실시하지 않았다.

## Follow-up

- [ ] CLI non-JSON error response에 대해 secret 누출 없는 bounded body diagnostics를 적용할지 검토
- [ ] Dev OpenAPI gate에 CLI error parser field-set drift를 직접 감지하는 검사를 추가할지 검토
- [ ] Frontend error response parsing도 동일한 수준의 fail-closed 처리가 필요한지 재점검

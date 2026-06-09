---
title: CLI DataResponse Envelope Strict Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - cli
  - api-contract
  - data-response
  - fail-closed
status: done
related:
  - "[[Frontend Success Envelope Strict Guard 2026-06-09]]"
  - "[[CLI Ingestion Status Extra Field Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# CLI DataResponse Envelope Strict Guard 2026-06-09

## 결론

CLI API client의 `DataResponse` root envelope를 Backend `common.py`의 `DataResponse(extra="forbid")`와 맞췄다. 이제 CLI는 성공 응답 root에서 `data` 외 field가 들어오면 upload/login/status/metadata boundary에서 fail-closed 처리한다.

> [!important] Goal constraint
> Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 근거

Backend 기준 계약은 `agentfeed-backend/app/schemas/common.py`다.

- `DataResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 root field: `data`

기존 CLI는 `responseDataEnvelope()`에서 `data` 존재만 확인했고 root extra field는 무시했다. 별도 parser인 metadata/status 응답도 같은 문제가 있었다. CLI는 credential 저장, token status preflight, draft upload처럼 민감 경계를 다루기 때문에 response wrapper drift도 명확히 거부해야 한다.

## 수정

- `src/api/client.ts`
  - `DATA_RESPONSE_ENVELOPE_FIELDS` 추가.
  - `responseDataEnvelope()`에서 root field set이 `data`만인지 검증.
  - `postJson()`과 `postIngest()`에 unexpected envelope field용 명확한 오류 메시지 추가.
  - `parseMetadataResponse()`가 primitive/null JSON을 안전하게 처리하고 root extra field를 거부하도록 수정.
  - `parseIngestionTokenStatusResponse()`가 root extra field를 거부하도록 수정.
- `tests/api-hook.test.ts`
  - metadata response root extra field rejection 추가.
  - ingestion status response root extra field rejection 추가.
  - remote preview upload response root extra field rejection 추가.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- tests/api-hook.test.ts
```

결과:

- `1` test file passed
- `126` tests passed

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run typecheck && npm run build && npm test
```

결과:

- TypeScript typecheck 통과
- build 통과
- `28` test files passed
- `585` tests passed

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- AgentFeed OpenAPI contract gate passed
- `75` operations checked
- `70` client contracts checked
- `40` response field contracts checked

## 후행 과제

- CLI error envelope parsing도 Backend `ErrorResponse` / `ErrorDetail` strict policy와 같은 수준으로 점검한다.
- CLI `parseCheckData()`는 health/reachability 경로에서만 쓰이는지 확인하고, DataResponse endpoint와 혼용되지 않도록 유지한다.
- Dev OpenAPI gate가 CLI `DataResponse` root field set을 직접 검증하도록 확장할지 검토한다.

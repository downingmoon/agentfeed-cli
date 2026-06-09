---
title: CLI Ingestion Status Extra Field Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - cli
  - ingestion
  - api-contract
  - fail-closed
status: done
related:
  - "[[CLI Auth Exchange Extra Field Guard 2026-06-09]]"
  - "[[Backend Ingest Strict Contract 2026-06-08]]"
  - "[[AgentFeed Current Product Brief]]"
---

# CLI Ingestion Status Extra Field Guard 2026-06-09

## 결론

CLI의 `/ingest/status` 응답 parser를 Backend ingestion status schema와 동일한 방향으로 fail-closed 처리했다. 이제 status root, `user`, `token` 객체에 예상하지 않은 필드가 들어오면 CLI는 token check를 unhealthy로 판단하고 업로드 전 preflight에서 멈출 수 있다.

> [!important] Goal constraint
> Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 근거

Backend 기준 계약은 `agentfeed-backend/app/schemas/ingestion.py`다.

- `IngestionStatusResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `ok`, `user`, `token`
- `IngestionStatusUser`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `id`, `username`, `display_name`, `avatar_url`
- `IngestionStatusToken`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `id`, `name`, `created_at`, `last_used_at`, `expires_at`, `expires_in_seconds`, `expiring_soon`

기존 CLI는 필수 타입과 날짜는 검증했지만 extra field는 무시했다. `/ingest/status`는 업로드 전 credential/token preflight에 쓰이는 경계라, Backend가 금지하는 raw token/hash/debug 필드가 섞였을 때 조용히 넘어가면 계약 drift를 놓칠 수 있다.

## 수정

- `src/api/client.ts`
  - `INGESTION_TOKEN_STATUS_FIELDS` 추가.
  - `INGESTION_TOKEN_STATUS_USER_FIELDS` 추가.
  - `INGESTION_TOKEN_STATUS_TOKEN_FIELDS` 추가.
  - `parseIngestionTokenStatus()`에서 status root, nested `user`, nested `token`의 extra field를 거부.
- `tests/api-hook.test.ts`
  - malformed ingestion status 응답 회귀 테스트에 다음 케이스 추가.
    - unexpected status root field
    - unexpected user field
    - unexpected token field

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- tests/api-hook.test.ts
```

결과:

- `1` test file passed
- `123` tests passed

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run typecheck && npm run build && npm test
```

결과:

- TypeScript typecheck 통과
- build 통과
- `28` test files passed
- `582` tests passed

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

- CLI의 legacy `fetchCheck()`/`parseCheckData()` 경로가 health check 외의 data를 조용히 cast하지 않는지 확인한다.
- Backend `RotatedIngestionTokenResponse`와 CLI rotate/login 저장 경계가 field set drift 없이 유지되는지 재검토한다.
- Dev OpenAPI gate가 nested CLI parser field set을 직접 검증하도록 확장할지 검토한다.

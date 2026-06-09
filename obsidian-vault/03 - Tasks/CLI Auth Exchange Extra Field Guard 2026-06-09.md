---
title: CLI Auth Exchange Extra Field Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - cli
  - auth
  - api-contract
  - fail-closed
status: done
related:
  - "[[CLI Auth Approval Response Guard 2026-06-08]]"
  - "[[CLI Auth Ingest Avatar Contract 2026-06-08]]"
  - "[[AgentFeed Current Product Brief]]"
---

# CLI Auth Exchange Extra Field Guard 2026-06-09

## 결론

`agentfeed login`의 브라우저 승인 exchange 응답을 Backend schema와 같은 방향으로 fail-closed 처리했다. 이제 CLI는 credential 저장 전에 root 응답 필드와 nested `user` 필드가 예상 field set을 벗어나면 malformed API response로 거부한다.

> [!important] Goal constraint
> Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 근거

Backend 기준 계약은 `agentfeed-backend/app/schemas/auth.py`의 schema다.

- `CliAuthExchangeResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `token`, `token_id`, `token_expires_at`, `user`, `rotated_from`, `rotated_at`
- `CliAuthExchangeUser`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `id`, `username`, `display_name`, `avatar_url`

기존 CLI parser는 필수 값과 타입은 검증했지만, root 또는 nested `user`에 추가 필드가 들어와도 조용히 무시했다. 브라우저 로그인 exchange는 기기 credential을 저장하는 경로라, Backend가 금지하는 extra field를 CLI도 저장 전 단계에서 같은 기준으로 거부해야 한다.

## 수정

- `src/api/client.ts`
  - `CLI_AUTH_EXCHANGE_RESULT_FIELDS` 추가.
  - `CLI_AUTH_EXCHANGE_USER_FIELDS` 추가.
  - `parseCliAuthExchangeResult()`에서 root 응답 extra field를 거부.
  - `parseOptionalUser()`에서 nested `user` extra field를 거부.
- `tests/api-hook.test.ts`
  - malformed browser exchange 응답 회귀 테스트에 다음 케이스 추가.
    - unexpected root field
    - unexpected user field
  - 기존 credential 저장 방지 검증 경로에 포함하여, 실패 시 token이 저장되지 않는 것을 유지.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- tests/api-hook.test.ts
```

결과:

- `1` test file passed
- `120` tests passed

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run typecheck && npm run build && npm test
```

결과:

- TypeScript typecheck 통과
- build 통과
- `28` test files passed
- `579` tests passed

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

- Backend ingestion status user/token schema도 `extra="forbid"`라면 CLI 쪽에도 동일한 explicit `hasOnlyExpectedFields` guard를 추가할지 검토한다.
- Dev OpenAPI gate가 nested CLI parser field set까지 감지할 수 있도록 확장할지 검토한다.
- Browser auth exchange는 credential write 직전 경계이므로, 향후에도 Backend `CliAuthExchangeResponse` / `CliAuthExchangeUser`와 field set을 같이 유지한다.

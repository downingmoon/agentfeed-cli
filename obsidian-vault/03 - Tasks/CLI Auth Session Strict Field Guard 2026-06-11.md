---
title: CLI Auth Session Strict Field Guard 2026-06-11
tags:
  - agentfeed
  - cli
  - contracts
  - verification
status: done
created: 2026-06-11
---

# CLI Auth Session Strict Field Guard 2026-06-11

## 목적

Backend `CliAuthSessionResponse`는 `extra="forbid"`인데 CLI `parseCliAuthSession`은 `session_id`, `authorize_url`, `user_code`, `expires_at`, `poll_interval_seconds` 외 응답 필드를 거부하지 않았다. 브라우저 승인 URL을 열기 전 API 계약 mismatch를 명확히 차단하도록 parser allowlist를 추가했다.

## Backend 기준

- `app/schemas/auth.py`
  - `CliAuthSessionResponse(extra="forbid")`
  - 허용 필드: `session_id`, `authorize_url`, `user_code`, `expires_at`, `poll_interval_seconds`
- `app/routers/cli_auth.py`
  - `POST /v1/auth/cli/sessions` 응답 모델: `DataResponse[CliAuthSessionResponse]`
- `app/cli_auth_sessions.py`
  - `_session_response`는 위 5개 필드만 생성한다.

## 변경 사항

- CLI `src/api/cli-auth-response.ts`
  - `CLI_AUTH_SESSION_FIELDS` allowlist 추가.
  - `parseCliAuthSession`에서 extra field를 `API_RESPONSE_INVALID`로 거부.
- CLI `tests/cli-auth-session-contract.test.ts`
  - 정상 backend session shape 보존 확인.
  - `{ ..., debug: true }` 같은 extra field가 브라우저 승인 전에 fail-closed 되는지 확인.

## 검증

- Red 확인
  - 신규 테스트 추가 직후 `npm test -- tests/cli-auth-session-contract.test.ts`가 `expected [Function] to throw an error`로 실패.
- Green 확인
  - CLI `npm run typecheck` 통과.
  - CLI `npm test -- tests/cli-auth-session-contract.test.ts tests/api-hook.test.ts` 통과: 134 passed.
  - Backend `uv run pytest tests/test_cli_auth_exchange_contracts.py tests/test_route_response_model_contracts.py` 통과: 11 passed.
- Hygiene
  - `src/api/cli-auth-response.ts`: 105 pure LOC.
  - `tests/cli-auth-session-contract.test.ts`: 20 pure LOC.
  - diff 내 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, 신규 `any`, empty catch 없음.

> [!warning] LSP 제한
> 로컬에 `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run typecheck`로 타입 검증했다.

## 후행 과제

- CLI auth status/approve response와 Frontend `CliAuthorizePage`의 session status parser가 Backend `CliAuthSessionStatusResponse`/`CliAuthApproveResponse` extra-forbid 기준과 동일하게 fail-closed 되는지 이어서 점검한다.
- CLI ingestion status는 이미 root/user/token allowlist가 있으나, `parseCheckData`의 tolerant path와 `parseIngestionTokenStatusResponse`의 strict path가 용도별로 적절히 분리되어 있는지 문서화 또는 focused test를 추가할 후보로 남긴다.

## 관련 노트

- [[Username Check Strict Field Guard 2026-06-11]]
- [[Set Username Strict Field Guard 2026-06-11]]

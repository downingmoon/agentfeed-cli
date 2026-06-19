---
title: Frontend CLI Auth Strict Field Guard 2026-06-11
tags:
  - agentfeed
  - frontend
  - cli-auth
  - contracts
  - verification
status: done
created: 2026-06-11
---

# Frontend CLI Auth Strict Field Guard 2026-06-11

## 목적

Backend CLI auth status/approve 응답은 `extra="forbid"`인데 Frontend `normalizeCliAuthSession`과 `normalizeCliAuthApproveResult`가 추가 필드를 조용히 허용하고 있었다. 브라우저 승인 화면에서 사용자 승인 전 API 계약 mismatch를 명확히 드러내도록 fail-closed guard를 추가했다.

## Backend 기준

- `app/schemas/auth.py`
  - `CliAuthSessionStatusResponse(extra="forbid")`
  - 허용 필드: `session_id`, `status`, `device_name`, `created_at`, `expires_at`, `approved_at`, `consumed_at`, `user_code_required`, `poll_interval_seconds`
  - `CliAuthApproveResponse(extra="forbid")`
  - 허용 필드: `ok`, `status`
- `app/routers/cli_auth.py`
  - `GET /v1/auth/cli/sessions/{session_id}` 응답 모델: `DataResponse[CliAuthSessionStatusResponse]`
  - `POST /v1/auth/cli/sessions/{session_id}/approve` 응답 모델: `DataResponse[CliAuthApproveResponse]`
- `app/cli_auth_sessions.py`
  - `_session_status_response`는 status 응답의 9개 필드만 생성한다.

## 변경 사항

- Frontend `src/lib/api-cli-auth.ts`
  - `CLI_AUTH_SESSION_FIELDS` allowlist 추가.
  - `CLI_AUTH_APPROVE_FIELDS` allowlist 추가.
  - `normalizeCliAuthSession`과 `normalizeCliAuthApproveResult`에서 extra field를 `CLI auth response contract mismatch`로 거부.
- Frontend `src/lib/cli-auth-strict-fields.contract.test.ts`
  - 정상 session/approve semantics 보존 확인.
  - `{ ..., debug: true }` 같은 extra field가 fail-closed 되는지 확인.
- Frontend `scripts/run-contract-tests.mjs`
  - 신규 focused contract test compile/run 목록에 추가.

## 검증

- Red 확인
  - 신규 테스트 추가 직후 `npm run test:contracts`가 `CLI auth strict-field guard did not fail closed: session extra field`로 실패.
- Green 확인
  - Frontend `npm run test:contracts` 통과.
  - Frontend `npm run lint && npm test` 통과.
  - Backend `uv run pytest tests/test_cli_auth_session_contracts.py tests/test_route_response_model_contracts.py tests/test_public_schema_response_model_contracts.py` 통과: 15 passed.
- Hygiene
  - `src/lib/api-cli-auth.ts`: 72 pure LOC.
  - `src/lib/cli-auth-strict-fields.contract.test.ts`: 34 pure LOC.
  - `scripts/run-contract-tests.mjs`: 136 pure LOC.
  - diff 내 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, 신규 `any`, empty catch 없음.

> [!warning] LSP 제한
> 로컬에 `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run lint`로 타입 검증했다.

## 후행 과제

- CLI auth exchange는 CLI parser에서 이미 root/user allowlist가 있고, Frontend는 exchange secret을 직접 소비하지 않는다. 남은 후보는 auth/me, settings, integration guide/status처럼 사용자 계정·설정 관련 read response의 extra-forbid ↔ frontend parser allowlist 정합성 점검이다.
- [x] `src/lib/cli-auth.contract.ts` flow-level 통합 계약에서 malformed response fail-closed cases는 [[Frontend CLI Auth Malformed Response Contract Split 2026-06-16]]로 분리했다. 앞으로도 단일 response schema strictness는 focused file로 유지한다.

## 관련 노트

- [[CLI Auth Session Strict Field Guard 2026-06-11]]
- [[Username Check Strict Field Guard 2026-06-11]]

## Follow-up

- [x] 2026-06-19 follow-up: `cli-auth-strict-fields.contract.test.ts` runner slimming handled in [[Frontend CLI Auth Strict Field Assertion Move 2026-06-19]]; strict-field assertions now live in `cli-auth-strict-field-assertions.ts`.

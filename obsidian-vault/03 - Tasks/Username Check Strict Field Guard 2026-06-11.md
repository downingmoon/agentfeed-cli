---
title: Username Check Strict Field Guard 2026-06-11
tags:
  - agentfeed
  - contracts
  - frontend
  - verification
status: done
created: 2026-06-11
---

# Username Check Strict Field Guard 2026-06-11

## 목적

Backend `UsernameCheckResponse`는 `extra="forbid"`인데 Frontend `normalizeUsernameCheck`가 `username`, `available`, `reason` 외 필드를 조용히 허용하고 있었다. Settings/profile username check 경로에서 계약이 느슨해지지 않도록 fail-closed guard를 추가했다.

## Backend 기준

- `app/schemas/user.py`
  - `UsernameCheckResponse(extra="forbid")`
  - 허용 필드: `username`, `available`, `reason`
  - `reason`: `already_taken | null`
- `app/routers/users.py`
  - `GET /v1/users/check-username` 응답 모델: `DataResponse[UsernameCheckResponse]`

## 변경 사항

- Frontend `src/lib/api-username-check.ts`
  - `USERNAME_CHECK_RESPONSE_FIELDS = ['username', 'available', 'reason']` allowlist 추가.
  - `normalizeUsernameCheck`에서 extra field를 `username check response contract mismatch`로 거부.
- Frontend `src/lib/username-check-strict-fields.contract.test.ts`
  - available/unavailable 정상 응답의 reason semantics 보존 확인.
  - `{ username, available, reason, email }` 같은 extra field가 fail-closed 되는지 확인.
- Frontend `scripts/run-contract-tests.mjs`
  - 신규 focused contract test compile/run 목록에 추가.

## 제외한 항목

- Notification list/read action 응답은 이미 `rejectUnexpectedKeysForContract` allowlist guard가 있었다.
  - `NotificationTarget`
  - `Notification`
  - `NotificationReadResponse`

## 검증

- Red 확인
  - 신규 테스트 추가 직후 `npm run test:contracts`가 `username check strict-field guard did not fail closed: extra fields`로 실패.
- Green 확인
  - Frontend `npm run test:contracts` 통과.
  - Frontend `npm run lint && npm test` 통과.
  - Backend `uv run pytest tests/test_route_response_model_contracts.py tests/test_shared_schema_boundary_contracts.py` 통과: 10 passed.
  - CLI `npm test -- tests/api-client-json-boundary.test.ts` 통과: 1 passed.
- Hygiene
  - `src/lib/api-username-check.ts`: 23 pure LOC.
  - `src/lib/username-check-strict-fields.contract.test.ts`: 21 pure LOC.
  - `scripts/run-contract-tests.mjs`: 134 pure LOC.
  - diff 내 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, 신규 `any`, empty catch 없음.

> [!warning] LSP 제한
> 로컬에 `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run lint`로 타입 검증했다.

## 후행 과제

- 다음 후보: ingestion token 응답, CLI auth 응답, moderation/comment 응답 중 Backend `extra="forbid"`와 Frontend parser allowlist/test coverage가 아직 focused file로 고정되지 않은 surface를 계속 점검한다.
- 기존 `api-contract.test.ts`는 계속 oversized 상태이므로 신규 coverage는 focused file로 유지한다.

## 관련 노트

- [[Set Username Strict Field Guard 2026-06-11]]
- [[Read Side Strict Field Guards 2026-06-11]]

## Follow-up

- [x] Focused runner assertion ownership moved in [[Frontend Username Check Strict Field Assertion Move 2026-06-19]].

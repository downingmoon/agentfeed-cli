---
title: Set Username Strict Field Guard 2026-06-11
tags:
  - agentfeed
  - contracts
  - frontend
  - verification
status: done
created: 2026-06-11
---

# Set Username Strict Field Guard 2026-06-11

## 목적

Backend `SetUsernameResponse`는 `extra="forbid"`인데 Frontend `normalizeSetUsernameResponse`가 `username` 외 필드를 조용히 허용하고 있었다. Settings/profile 저장 경로에서 계정 응답 contract가 느슨해지지 않도록 fail-closed guard를 추가했다.

## Backend 기준

- `app/schemas/user.py`
  - `SetUsernameResponse(extra="forbid")`
  - 허용 필드: `username`
- `app/routers/users.py`
  - `POST /v1/me/username` 응답 모델: `DataResponse[SetUsernameResponse]`

## 변경 사항

- Frontend `src/lib/api-account.ts`
  - `SET_USERNAME_RESPONSE_FIELDS = ['username']` allowlist 추가.
  - `normalizeSetUsernameResponse`에서 extra field를 `profile mutation response contract mismatch`로 거부.
- Frontend `src/lib/account-strict-fields.contract.test.ts`
  - valid `{ username }` 응답 보존 확인.
  - `{ username, email }` 같은 extra field가 fail-closed 되는지 확인.
- Frontend `scripts/run-contract-tests.mjs`
  - 신규 focused contract test compile/run 목록에 추가.

## 검증

- Red 확인
  - 신규 테스트 추가 직후 `npm run test:contracts`가 `set username strict-field guard did not fail closed: extra fields`로 실패.
- Green 확인
  - Frontend `npm run test:contracts` 통과.
  - Frontend `npm run lint && npm test` 통과.
  - Backend `uv run pytest tests/test_route_response_model_contracts.py tests/test_shared_schema_boundary_contracts.py` 통과: 10 passed.
  - CLI `npm test -- tests/api-client-json-boundary.test.ts` 통과: 1 passed.
- Hygiene
  - `src/lib/api-account.ts`: 50 pure LOC.
  - `src/lib/account-strict-fields.contract.test.ts`: 19 pure LOC.
  - `scripts/run-contract-tests.mjs`: 132 pure LOC.
  - diff 내 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, 신규 `any`, empty catch 없음.

> [!warning] LSP 제한
> 로컬에 `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run lint`로 타입 검증했다.

## 후행 과제


- 2026-06-19: assertion orchestration은 [[Frontend Account Strict Field Assertion Move 2026-06-19]]에서 `account-strict-field-assertions.ts`로 이동했고 focused runner는 2 pure LOC로 축소했다.
- Integration guide는 이미 root/step allowlist와 source contract가 있어 이번 슬라이스에서 변경하지 않았다.
- 다음 후보: username check response, notification action/read response, integration guide의 runtime focused test 보강 여부를 Backend schema 기준으로 계속 점검한다.
- 기존 `api-contract.test.ts`는 계속 oversized 상태이므로 신규 coverage는 focused file로 유지한다.

## 관련 노트

- [[Read Side Strict Field Guards 2026-06-11]]
- [[Explore Strict Field Guards 2026-06-11]]

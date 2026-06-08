---
title: Username Check Reason Contract Guard 2026-06-08
aliases:
  - Username Check Reason Contract Guard
status: completed
tags:
  - agentfeed/todo
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
created: 2026-06-08
updated: 2026-06-08
---

# Username Check Reason Contract Guard 2026-06-08

## 목적

`/v1/users/check-username` 응답의 `reason`이 broad `string`으로 열려 있어, Backend가 계약 밖 reason을 반환하거나 Frontend가 unknown reason을 조용히 수용할 수 있는 drift를 제거했다.

> [!success] 완료 판정
> 현재 Backend가 반환하는 유일한 reason인 `already_taken`만 Backend schema와 Frontend parser/type에서 허용하도록 고정했다.

## 변경 내용

- Backend `UsernameCheckResponse.reason`
  - `str | None` → `Literal["already_taken"] | None`.
- Backend regression test 추가.
  - reason 없음: available username으로 허용.
  - `already_taken`: unavailable username으로 허용.
  - `reserved`: schema validation reject.
- Frontend `ApiUsernameCheckReason` 추가.
  - `already_taken` closed union.
- Frontend `ApiUsernameCheckResponse` 추가.
  - `reason?: ApiUsernameCheckReason`.
- Frontend `normalizeUsernameCheck`
  - `nullableTrimmedStringForContract` 대신 `requireOneOfForContract`로 unknown reason fail-closed.
- Frontend contract/source tests 추가.
  - unknown reason `reserved` reject.
  - source guard로 reason union/parser 재오픈 방지.

## 검증

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_username_check_reason_contract_is_closed`
  - `uv run ruff check app/schemas/user.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest`: 413 passed, 1 warning
  - `uv run ruff check .`: passed
- Frontend:
  - `npm run test:contracts`: passed
  - `npm run lint`: passed
- CLI:
  - `npm run release:preflight`: 27 files, 568 tests passed

## 후행 과제

> [!note]
> 이번 작업은 신규 username policy reason 추가가 아니라 existing response contract hardening이다.

- `reserved`, `invalid_format`, `too_short` 같은 reason이 필요하면 Backend validation policy와 Frontend copy가 함께 필요한 신규 UX/API 변경으로 보고 별도 Obsidian spec에서 먼저 결정한다.

## 관련 문서

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[User Account Response Guard 2026-06-08]]

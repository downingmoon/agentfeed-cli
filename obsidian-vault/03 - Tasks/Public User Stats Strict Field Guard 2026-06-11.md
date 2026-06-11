---
title: Public User Stats Strict Field Guard
date: 2026-06-11
tags:
  - agentfeed/contracts
  - frontend
  - backend
  - verification
status: done
---

# Public User Stats Strict Field Guard

## 요약

Backend `PublicUser`, `UserPublicStats`, `UserViewerState`는 모두 `extra="forbid"` 계약이다. Frontend `normalizeUserPublic`도 현재 Backend stats 필드셋만 허용하고, `current_streak_days`를 보존하며, `viewer_state` extra field를 fail-closed 처리하도록 수정했다.

## 발견한 불일치

- Frontend user stats normalizer가 과거/내부 alias인 `worklog_count`, `public_worklog_count`, `total_tokens`, `total_files` 등을 API 응답에서 허용했다.
- Backend `UserPublicStats`의 `current_streak_days`가 Frontend normalized stats 타입/객체에 보존되지 않았다.
- Backend `UserViewerState`는 `following`만 허용하지만 Frontend는 `muted` 같은 extra field를 거부하지 않았다.

## 변경 내용

- `agentfeed-frontend/src/lib/api-public-user.ts`
  - stats 허용 필드를 Backend 기준으로 제한:
    - `total_public_worklogs`
    - `total_public_projects`
    - `total_tokens_public`
    - `total_files_changed_public`
    - `total_lines_added_public`
    - `total_tests_run_public`
    - `current_streak_days`
    - `followers_count`
    - `following_count`
  - `current_streak_days`를 `ApiUserStats`에 보존.
  - `viewer_state` 허용 필드를 `following`으로 제한.
- `agentfeed-frontend/src/lib/public-user-strict-stats.contract.test.ts`
  - `users.get`이 `current_streak_days`를 보존하는지 확인.
  - raw aggregate/legacy alias/viewer extra field가 `ApiError(502)`로 차단되는지 확인.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - API raw payload fixture를 현재 Backend `UserPublicStats` shape으로 정정.
  - 기존 대형 contract 파일은 pre-existing oversized 상태라 새 케이스는 focused test file로 분리.
- `agentfeed-frontend/scripts/run-contract-tests.mjs`
  - 새 계약 테스트를 전체 contract suite에 포함.

## 검증

- Frontend
  - `npm run test:contracts` 통과
  - `npm run lint` 통과 (`tsc --noEmit`)
  - `npm test` 통과
- Backend
  - `uv run pytest tests/test_public_schema_response_model_contracts.py tests/test_route_response_model_contracts.py` 통과: 8 passed
- CLI
  - `npm test -- tests/api-client-json-boundary.test.ts` 통과
- LOC 점검
  - `src/lib/api-public-user.ts`: 137 pure LOC
  - `src/lib/public-user-strict-stats.contract.test.ts`: 75 pure LOC
  - `scripts/run-contract-tests.mjs`: 122 pure LOC
  - `src/lib/api-contract.test.ts`: 5378 pure LOC, pre-existing oversized contract file. 이번 변경은 기존 fixture 정정만 수행했고 새 회귀 테스트는 분리했다.

> [!info]
> LSP diagnostics는 로컬 `typescript-language-server`가 설치되어 있지 않아 실행하지 못했다. 동일 범위의 타입 검증은 Frontend `npm run lint`의 `tsc --noEmit`로 통과 확인했다.

## 후행 과제

- `api-contract.test.ts`는 기존부터 과도하게 큰 테스트 파일이다. 신규 계약 케이스는 계속 focused file로 분리하고, 별도 cleanup slice에서 기존 `assert*` cluster를 단계적으로 분리하는 것이 안전하다.
- Project/User/Search/Explore의 remaining nested public response 객체도 Backend schema 기준으로 계속 감사한다.

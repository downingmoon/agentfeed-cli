---
title: Frontend Settings Timezone Profile Contract Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - api-contract
  - settings
  - profile
  - timezone
  - contract-mismatch
status: done
related:
  - "[[Frontend Privacy Finding Resolution Contract Guard 2026-06-11]]"
  - "[[Frontend API Contract Hub Split Candidate 2026-06-11]]"
---

# Frontend Settings Timezone Profile Contract Guard 2026-06-11

## 요약

Backend `PATCH /v1/me/profile`의 `UpdateProfileRequest`는 `timezone`을 허용하고, `auth.me` 응답도 `timezone`을 포함한다.
Frontend는 `ApiAuthMe.timezone`은 읽고 있었지만, settings profile form / `ApiUpdateProfileBody` / profile save helper / settings UI에서 `timezone`을 빠뜨리고 있었다.

이번 작업은 신규 도메인 기능이 아니라 **이미 존재하는 Backend profile contract를 Frontend settings save 흐름에 연결**한 것이다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiUpdateProfileBody.timezone: string | null` 추가
- `agentfeed-frontend/src/lib/settings-profile-save.ts`
  - `SettingsProfileForm.timezone` 추가
  - `settingsProfileFormFromUser()`가 `ApiAuthMe.timezone`을 form에 반영
  - `settingsProfilePatchFromForm()`이 `timezone`을 trim/null 정규화하여 profile patch body에 포함
  - profile save 결과의 `userPatch`에도 저장 요청 timezone을 반영해 AppContext와 form이 갱신되도록 보존
- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
  - Profile form에 `Timezone` 입력 추가
- `agentfeed-frontend/scripts/run-contract-tests.mjs`
  - 기존에 `settings-profile-save.contract.test.ts`가 컴파일만 되고 실행 목록에서 빠져 있던 문제 수정
- `agentfeed-backend/tests/test_user_profile_input_contracts.py`
  - `UpdateProfileRequest.timezone` trim 계약과 `update_profile()` 저장/audit changed_fields 계약 추가

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/settings-profile-save.contract.test.ts src/lib/page-source-contract.test.ts
npm test
npm run lint
git diff --check
```

결과: 모두 통과.

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest tests/test_user_profile_input_contracts.py::test_user_profile_and_username_inputs_are_bounded_before_database_write tests/test_user_profile_input_contracts.py::test_update_profile_can_clear_nullable_fields_and_trim_display_name -q
uv run ruff check tests/test_user_profile_input_contracts.py
git diff --check
```

결과: 모두 통과.

## 발견한 추가 이슈

> [!bug]
> `scripts/run-contract-tests.mjs`가 `settings-profile-save.contract.test.ts`를 `tsc` 입력에는 넣었지만 실제 `node` 실행 목록에는 포함하지 않았다. 이번 작업에서 실행 목록에 추가했다.

## 제약 / 남은 리스크

> [!warning]
> Frontend `src/lib/api.ts`, `src/components/pages/SettingsPage.tsx`, `src/lib/page-source-contract.test.ts`는 이미 대형 파일이다. 이번 작업은 Backend contract 누락을 막기 위한 최소 변경으로 제한했고, 구조 분리는 [[Frontend API Contract Hub Split Candidate 2026-06-11]]에서 별도 추적한다.

- `PATCH /me/profile` 응답 모델은 `PublicUser`라 `timezone`을 다시 내려주지 않는다.
- 따라서 Frontend는 저장 요청에 사용한 trim/null 정규화 timezone을 AppContext patch로 반영한다.
- 서버 배포는 현재 goal 규칙에 따라 수행하지 않았다.

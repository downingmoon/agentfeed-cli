---
title: Profile Username Settings Surface
aliases:
  - Settings Profile Edit
  - Username Settings UX
created: 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/api
  - agentfeed/integration
status: done
---

# Profile Username Settings Surface

## 목표

Backend에 이미 존재하던 `PATCH /v1/me/profile`, `POST /v1/me/username` 계약을 Frontend Settings에서 실제로 사용할 수 있게 연결해, 사용자가 public identity를 직접 관리할 수 있도록 했습니다.

> [!important]
> API field 이름과 parameter 기준은 Backend/OpenAPI를 따릅니다. Frontend는 display/profile field를 임의 이름으로 변환하지 않고 Backend의 `display_name`, `website_url`, `github_url`, `x_url` 계약을 그대로 사용합니다.

## 구현 요약

Backend:

- `UpdateProfileRequest`가 `display_name`, `bio`, `location`, `timezone`을 trim/blank-normalize합니다.
- `display_name` blank 입력은 DB write 전에 validation error가 됩니다.
- `PATCH /v1/me/profile`은 `exclude_unset=True`를 사용해 nullable public profile fields를 실제로 clear할 수 있습니다.
- `display_name=null`은 skip해 non-null DB column을 보호합니다.

Frontend:

- `me.updateProfile()` → `PATCH /v1/me/profile` helper 추가.
- `me.setUsername()` → `POST /v1/me/username` helper 추가.
- Settings page에 Profile and username section을 추가했습니다.
- display name, username, bio, location, website, GitHub, X를 편집할 수 있습니다.
- 저장 성공 후 `AppContext.updateCurrentUser()`로 Header/profile link 등 app identity를 즉시 갱신합니다.
- Profile save는 privacy/notification save와 분리했습니다.

Dev gate:

- `agentfeed-dev/scripts/check-openapi-contract.mjs` client matrix에 `/v1/me/profile`, `/v1/me/username`을 추가했습니다.
- 두 endpoint를 backend-only 분류에서 제거했습니다.

## 검증 증거

- Backend targeted:
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'user_profile_and_username_inputs_are_bounded_before_database_write or update_profile_can_clear_nullable_fields'` → `2 passed`
- Backend lint:
  - `uv run --python 3.12 --locked --group dev ruff check app/routers/me.py app/schemas/user.py tests/test_contracts.py` → pass
- Frontend contract:
  - `npm run test:contracts` in `agentfeed-frontend` → pass
- Frontend typecheck:
  - `npx tsc --noEmit` in `agentfeed-frontend` → pass
- Dev OpenAPI gate:
  - `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → pass
  - Client contracts checked: 60 (`cli: 6`, `frontend: 54`)
  - Classified backend-only operations: 8

## 남은 Backend-only product gap

> [!todo]
> 이번 작업으로 profile/username endpoints는 product gap에서 제거됐습니다. 남은 항목은 report actions, project mutations, public activity입니다.

- Worklog/comment report action UI
- Project create/edit/delete UI
- User public activity tab

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Profile username settings surface]]
- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]

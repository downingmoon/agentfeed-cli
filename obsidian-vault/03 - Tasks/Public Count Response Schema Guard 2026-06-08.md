---
title: Public Count Response Schema Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
updated: 2026-06-08
tags:
  - agentfeed
  - backend
  - frontend-contract
  - schema
  - enterprise-readiness
related:
  - "[[Search Explore Nested Contract Guard 2026-06-08]]"
  - "[[Worklog Action Response Guard 2026-06-08]]"
  - "[[User Account Response Guard 2026-06-08]]"
---

# Public Count Response Schema Guard 2026-06-08

## 배경

Frontend는 public feed, worklog card/detail, social actions, profile, projects, dashboard, explore/discovery 화면에서 count/aggregate 값을 모두 non-negative로 fail-closed 검증한다. Backend 런타임 값은 대부분 DB `count`/`sum` 기반이라 음수가 나오지 않는 구조였지만, 일부 Pydantic response schema에는 `ge=0`이 빠져 OpenAPI/response contract가 프론트의 strict normalizer보다 약했다.

> [!important]
> 이번 변경은 신규 기능이 아니라 CLI-Frontend-Backend contract 완성도 보강이다. “음수 count는 API 계약상 불가능하다”는 불변식을 Backend schema에도 명시한다.

## 변경

Backend response schema에 `Field(ge=0)`를 적용했다.

- `app/schemas/social.py`
  - `likes_count`, `bookmarks_count`, `followers_count`, comment `likes_count`
- `app/schemas/worklog.py`
  - `WorklogSocialStats`의 likes/comments/bookmarks/shares count
- `app/schemas/project.py`
  - `ProjectStats`의 public aggregate/count 필드
- `app/schemas/user.py`
  - `UserPublicStats`, `UserActivityDay`의 count/metric 필드
- `app/schemas/explore.py`
  - popular prompt, rising builder, featured category count
- `app/schemas/discovery.py`
  - tag `worklogs_count`
- `app/schemas/dashboard.py`
  - period stats 및 dashboard summary count

## Regression

- `tests/test_contracts.py::test_public_count_response_schemas_reject_negative_values`
  - 각 public count/aggregate response schema가 음수 payload를 거부하는지 검증한다.
  - nullable metric은 `None`을 계속 허용한다.

## 검증

- Backend targeted contract tests ✅
  - `uv run pytest tests/test_contracts.py::test_public_count_response_schemas_reject_negative_values tests/test_contracts.py::test_project_search_explore_notification_integration_and_ingest_routes_have_response_models -q`
- Backend full contract file ✅
  - `uv run pytest tests/test_contracts.py -q`
  - 결과: `388 passed, 1 warning`
- Frontend contract tests ✅
  - `npm run test:contracts`

## 후행 과제

> [!todo]
> 다음 contract hardening pass에서는 OpenAPI JSON schema 자체에 `minimum: 0`이 노출되는지 snapshot/contract test로 추가 확인할 수 있다. 현재는 Pydantic validation regression으로 런타임 response contract를 고정했다.

> [!note]
> 이번 작업에서는 목표 규칙에 따라 서버 배포, 인프라, CICD 변경은 하지 않았다.

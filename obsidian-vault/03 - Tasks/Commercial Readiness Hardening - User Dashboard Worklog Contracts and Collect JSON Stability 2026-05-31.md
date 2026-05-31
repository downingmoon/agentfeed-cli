---
title: User Dashboard Worklog Contracts and Collect JSON Stability
aliases:
  - User Dashboard Worklog Response Models
  - Collect JSON Stability
created: 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/integration
  - agentfeed/backend
  - agentfeed/cli
status: done
---

# User Dashboard Worklog Contracts and Collect JSON Stability

## 목표

상용화 readiness 관점에서 Backend OpenAPI response model 누락을 줄이고, CLI `collect --json` 자동화 출력 shape를 명시 계약으로 고정했습니다.

> [!important]
> 문서 기록은 앞으로 `obsidian-vault/`에 Obsidian Markdown으로 남깁니다. 이 노트는 [[Integration - CLI Backend Frontend]], [[Collection System]], [[Active Tasks]]에 연결됩니다.

## 변경 요약

### Backend response model 보강

- User/Profile 공개 route:
  - `GET /v1/users/check-username` → `DataResponse[UsernameCheckResponse]`
  - `GET /v1/users/{username}` → `DataResponse[PublicUser]`
  - `POST|DELETE /v1/users/{username}/follow` → `DataResponse[FollowResponse]`
  - `GET /v1/users/{username}/worklogs` → `ListResponse[WorklogCard]`
- Me/Dashboard route:
  - `PATCH /v1/me/profile` → `DataResponse[PublicUser]`
  - `POST /v1/me/username` → `DataResponse[SetUsernameResponse]`
  - `GET /v1/me/worklogs` / `GET /v1/me/bookmarks` → `ListResponse[WorklogCard]`
  - `GET /v1/me/dashboard/summary` → `DataResponse[DashboardSummaryResponse]`
  - `GET /v1/me/dashboard/recent-worklogs` → `ListResponse[DashboardRecentWorklog]`
- Worklog detail/review/publish route:
  - `POST /v1/worklogs` → `DataResponse[WorklogCreateResponse]`
  - `GET /v1/worklogs/{worklog_id}` → `DataResponse[Worklog]`
    - Worklog schema는 `social` / `viewer_state`를 포함해 response filtering으로 Frontend detail state가 손실되지 않게 했습니다.
  - `PATCH /v1/worklogs/{worklog_id}` → `DataResponse[WorklogUpdateResponse]`
  - `DELETE /v1/worklogs/{worklog_id}` → `OkResponse`
  - `GET /v1/worklogs/{worklog_id}/review` → `DataResponse[WorklogReviewResponse]`
  - `POST /v1/worklogs/{worklog_id}/privacy-findings/{finding_id}/resolve` → `DataResponse[ResolvePrivacyFindingResponse]`
  - `POST /v1/worklogs/{worklog_id}/publish` → `DataResponse[PublishWorklogResponse]`
  - `POST /v1/worklogs/{worklog_id}/unpublish` → `DataResponse[UnpublishWorklogResponse]`

### CLI collect JSON 계약 고정

`agentfeed collect --json`는 기존 호환성을 유지해 local draft object를 JSON root로 출력합니다. `--upload`가 붙어도 wrapper로 바꾸지 않고 `draft.upload`에 upload 결과만 추가합니다.

> [!warning]
> `share --json`은 `{ draft, upload }` envelope를 사용하지만, `collect --json`은 raw draft root입니다. 이 차이는 README와 회귀 테스트로 고정했습니다.

## 검증 증거

- Backend targeted contract test:
  - `.venv/bin/pytest tests/test_contracts.py -q -k 'profile_dashboard_and_worklog_routes_have_response_models or public_discovery_routes_have_response_models or social_and_comment_routes_have_response_models'` → `3 passed, 195 deselected`
- Backend lint/static:
  - `.venv/bin/ruff check app/routers/me.py app/routers/users.py app/routers/worklogs.py app/schemas/dashboard.py app/schemas/user.py app/schemas/worklog.py tests/test_contracts.py` → pass
  - `git diff --check` → pass
- Backend full:
  - `.venv/bin/pytest -q` → `212 passed, 1 warning`
- CLI targeted/full:
  - `npm test -- --run tests/cli-collect.test.ts` → `5 passed`
  - `npm run typecheck` → pass
  - `npm test -- --run` → `251 passed`
  - `git diff --check` → pass

## 남은 의도적 제외

- Project family response models는 payload에 `owner`, `stats`, project list item 확장이 섞여 있어 별도 schema 설계가 필요합니다.
- User activity response는 date histogram 전용 schema로 분리하는 편이 안전합니다.
- Auth/CLI session route와 ingestion/explore/search/notifications/integrations의 남은 untyped route는 다음 slice 후보입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 User dashboard worklog response model contract]]
- [[Collection System#2026-05-31 collect JSON root contract]]
- [[Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31]]
- [[Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31]]

---
title: Worklog Action Response Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/worklog
  - project/tasks
aliases:
  - Worklog Publish Response Guard
---

# Worklog Action Response Guard 2026-06-08

## 결론

Worklog review 화면에서 사용하는 privacy finding resolution, publish, unpublish action 응답을 Frontend runtime boundary와 Backend OpenAPI schema 양쪽에서 더 좁게 검증하도록 보강했다.

> [!success]
> 이제 malformed `200 OK` worklog action 응답은 review/publish UI state에 반영되기 전에 `ApiError(502)`로 fail-closed 된다.

## Backend 기준

Backend 구현상 publish/unpublish boundary에서는 `status`가 `visibility`를 mirror 한다.

- `ResolvePrivacyFindingResponse`
  - `finding_id`
  - `resolved`
  - `resolution`: `ignored | redacted | removed`
- `PublishWorklogResponse`
  - `id`
  - `status`: `public | unlisted | private`
  - `visibility`: `public | unlisted | private`
  - `published_at`
- `UnpublishWorklogResponse`
  - `id`
  - `status`: `private | unlisted`
  - `visibility`: `private | unlisted`

## 변경

### Backend

- `app/schemas/worklog.py`
  - `PublishWorklogResponse.status/visibility` enum을 실제 route 반환 범위로 축소.
  - `UnpublishWorklogResponse.status/visibility` enum을 실제 route 반환 범위로 축소.

### Frontend

- `src/lib/api.ts`
  - `resolveFinding`, `publish`, `unpublish` 응답 normalizer 추가.
  - `resolution`, `status`, `visibility`, `published_at`를 runtime 검증.
  - publish/unpublish 후 `status === visibility` invariant 검증.
- `src/lib/api-contract.test.ts`
  - malformed privacy resolution/publish/unpublish 응답 fail-closed 테스트 추가.

### Dev contract gate

- `scripts/check-openapi-contract.mjs`
  - privacy finding resolve / publish / unpublish response field contract 추가.
  - 각 응답의 required field, enum, date-time schema gate 추가.

## 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm run test:contracts
```

- `npm run lint`: 통과.
- `npm run test:contracts`: 통과.

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- OpenAPI operations: 75
- Client contracts: 70
- Response field contracts: 40
- Schema field contracts: 175 fields across 36 operations
- 결과: 통과.

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest -q tests/test_contracts.py -k "resolve_privacy_finding or publish_worklog or unpublish_worklog or profile_dashboard_and_worklog_routes_have_response_models"
uv run ruff check app/schemas/worklog.py app/routers/worklogs.py tests/test_contracts.py
```

- pytest: `1 passed, 371 deselected`
- ruff: `All checks passed!`

## 후행 과제

- [ ] 같은 방식으로 project create/update, settings update 등 remaining mutation response가 runtime guard 없이 UI state를 갱신하는지 계속 audit.
- [ ] broad enum schema가 실제 route 반환 범위보다 넓은 다른 endpoint가 있는지 Dev gate 중심으로 점검.

## 관련

- [[Frontend Social Response Guard 2026-06-08]]
- [[Frontend Request Strict Contract 2026-06-08]]
- [[Integration - CLI Backend Frontend]]

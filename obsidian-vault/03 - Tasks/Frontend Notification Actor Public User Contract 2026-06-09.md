---
title: Frontend Notification Actor Public User Contract 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - api-contract
  - notifications
  - public-user
status: done
related:
  - "[[AgentFeed Current Product Brief]]"
  - "[[Frontend Public User Contract Alignment 2026-06-09]]"
  - "[[Notification Target Strict Payload Guard 2026-06-09]]"
---

# Frontend Notification Actor Public User Contract 2026-06-09

> [!success] Status
> 완료. Backend `Notification.actor` 스키마가 `PublicUser | None` 인 사실에 맞춰 Frontend notification actor 파서를 `ApiUser` 기반에서 `ApiUserPublic` 기반으로 정렬했다.

## 배경

- Backend schema: `agentfeed-backend/app/schemas/notification.py`
  - `Notification.actor: PublicUser | None = None`
  - `NotificationTarget` 는 `extra="forbid"` 로 엄격하게 닫혀 있음.
- Backend router는 notification actor를 `_build_public_user(actor_user)` 로 생성한다.
- 기존 Frontend는 `ApiNotificationActor extends ApiUser` 및 `normalizeUserForContract()` 를 사용해 actor를 기본 user payload로 해석했다.
- 따라서 `stats`, `viewer_state` 같은 PublicUser 필드가 계약상 존재하는데도 Frontend contract layer가 이를 좁게 검증하는 drift가 있었다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiNotificationActor extends ApiUserPublic` 로 변경.
  - `normalizeNotificationItem()` 의 actor 파서를 `normalizePublicUserForContract()` 로 변경.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - notification fixture에 Backend raw `PublicUser.stats` 및 `viewer_state` 를 추가.
  - notification list guard가 actor의 public stats/viewer state까지 보존하는지 검증.
  - `notificationHref()` typed fixture를 `ApiNotificationActor` 변경에 맞춰 normalized public stats 형태로 보강.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - notification actor가 `normalizePublicUserForContract()` 를 쓰도록 source-level guard 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts
npm test
npm run lint
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
  NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
  NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
  npm run build
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080/v1 \
  AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
  AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
  NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
  npm run check:api-compatibility
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- 전체 Frontend contract test 통과.
- TypeScript lint/typecheck 통과.
- 개인서버 API URL 기준 Next production build 통과.
- Frontend hosted API probe 통과: `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`.
- Dev OpenAPI contract gate 통과.

## 배포

- 이번 pass의 소스 검증 후 사용자의 최신 지시에 따라 개인서버 배포를 1회 수행 대상으로 둔다.
- 배포 후에는 smoke/API compatibility evidence를 별도 결과에 기록한다.

## 후속 작업

- [ ] Backend `PublicUser` 필드가 추가/변경될 때 notification actor parser와 fixture를 같이 갱신한다.
- [ ] 인증된 notification list UI에서 actor stats/viewer state가 표시/비표시 정책에 맞게 렌더링되는지 browser smoke를 별도 pass에서 확인한다.
- [ ] Dev OpenAPI nested `PublicUser` classification이 notification actor까지 명시적으로 추적되는지 개선 여지를 검토한다.

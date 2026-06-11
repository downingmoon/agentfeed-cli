---
title: Frontend API Notification Split 2026-06-11
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Notification Split 2026-06-11

## 목적

Frontend `src/lib/api.ts`에 남아 있던 notification list response contract를 feature-owned module로 분리해 API facade를 계속 축소한다.

## 변경

- `agentfeed-frontend/src/lib/api-notifications.ts` 추가.
  - `ApiNotificationType`, `ApiNotificationTargetType`, `ApiNotificationTarget`, `ApiNotificationActor`, `ApiNotification` 타입 소유.
  - `/me/notifications` list response parser를 fail-closed 유지.
  - notification `type`과 `target.type`을 closed readonly set으로 검증.
  - actor는 backend `PublicUser` shape로 파싱하고 malformed actor/target payload를 list boundary에서 502 contract mismatch로 드러낸다.
- `agentfeed-frontend/src/lib/api.ts`는 `@/lib/api` public type export와 `me.notifications()` 호출 surface만 유지.
- `page-source-contract.test.ts`의 notification source guard를 새 notification module로 이동.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm test
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  AGENTFEED_ALLOW_LOCAL_API_BUILD=1 \
  AGENTFEED_SKIP_PROD_API_COMPAT=1 \
  npm run build
```

결과:

- `npm run lint`: 통과.
- `npm test`: 통과.
- `npm run build`: 통과, Next.js 15.5.19 production build 성공.

## LOC evidence

```text
src/lib/api.ts pure LOC: 1792
src/lib/api-notifications.ts pure LOC: 185
src/lib/page-source-contract.test.ts pure LOC: 1200
```

> [!warning]
> `api.ts`와 `page-source-contract.test.ts`는 여전히 250 pure LOC를 초과한다. 이번 slice는 notification list 계약만 분리했으며, 다음 slice에서 public-user parser 중복을 공통 module로 이동하거나 discovery/search contract cluster를 분리해야 한다.

## Commit

- Frontend: `4b58a09` — `Isolate frontend notification contracts`

## 후속 작업

- `api-notifications.ts`에 로컬 보존된 public-user parser와 `api.ts`의 public-user parser를 dedicated `api-public-user` contract module로 통합한다.
- `api.ts`의 discovery/search/explore parser cluster를 feature-owned module로 계속 분리한다.
- oversized `page-source-contract.test.ts`를 source guard domain별 파일로 분리한다.

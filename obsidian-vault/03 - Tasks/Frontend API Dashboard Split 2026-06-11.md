---
title: Frontend API Dashboard Split 2026-06-11
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Dashboard Split 2026-06-11

## 목적

Frontend `src/lib/api.ts`의 dashboard summary/recent worklog response contract 책임을 feature-owned module로 분리해, API client facade가 계속 작아지도록 한다.

## 변경

- `agentfeed-frontend/src/lib/api-dashboard.ts` 추가.
  - `ApiDashboardPeriodStats`, `ApiDashboardSummary`, `ApiDashboardActionUrl`, `ApiDashboardRecentWorklog` 타입 소유.
  - dashboard summary counter parser를 fail-closed 유지.
  - recent worklog `action_url`을 `/worklogs/:id` 또는 `/worklogs/:id/review` 내부 경로로만 구성.
  - recent worklog status는 local readonly closed set으로 검증.
- `agentfeed-frontend/src/lib/api.ts`는 `@/lib/api` public export surface와 `me.dashboardSummary()` / `me.dashboardRecentWorklogs()` 호출 surface만 유지.
- `page-source-contract.test.ts`의 dashboard action URL source guard를 새 dashboard module로 이동.

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
src/lib/api.ts pure LOC: 1901
src/lib/api-dashboard.ts pure LOC: 86
src/lib/page-source-contract.test.ts pure LOC: 1199
```

> [!warning]
> `api.ts`와 `page-source-contract.test.ts`는 여전히 250 pure LOC를 초과한다. 이번 slice는 dashboard 계약 책임만 분리했으며, 다음 slice에서도 read-contract/parser cluster 단위로 계속 줄여야 한다.

## Commit

- Frontend: `daae14d` — `Isolate frontend dashboard contracts`

## 후속 작업

- `api.ts`의 남은 read-contract parser cluster를 feature-owned module로 계속 분리한다.
- oversized `page-source-contract.test.ts`를 source guard domain별 test file로 분리한다.

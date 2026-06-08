---
title: Strict Read List Envelope Guard 2026-06-08
aliases:
  - Strict List Envelope Guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/evidence
---

# Strict Read List Envelope Guard 2026-06-08

> [!success] 결과
> Backend `ListResponse` contract를 쓰는 주요 read-list surface에서 permissive list envelope 보정을 제거했다. 이제 worklog card lists, dashboard recent worklogs, notifications는 `data[]`와 `pagination`이 누락/오염된 successful payload를 빈 화면으로 숨기지 않고 `502 ApiError` contract diagnostic으로 fail-closed 처리한다.

## 변경 범위

- `normalizeWorklogCardListResponse()`
  - `normalizeListResponse<unknown>`에서 `normalizeStrictListResponse(..., worklogCardContractError)`로 전환.
  - 적용 surface: public feed, following feed, profile worklogs, project worklogs, explore category worklogs, `me.worklogs`, `me.bookmarks`.
- `normalizeDashboardRecentWorklogs()`
  - strict `ListResponse` envelope 검증으로 전환.
- `normalizeNotificationList()`
  - strict `ListResponse` envelope 검증으로 전환.
- Contract tests
  - worklog card list missing pagination fail-closed case 추가.
  - dashboard recent missing pagination fail-closed case 추가.
  - notification list missing pagination fail-closed case 추가.

## 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- OpenAPI contract gate: 75 operations, 70 client contracts, 40 response field contracts, 232 request body fields, 175 schema fields 통과.

## 후행 과제

- [ ] `normalizeListResponse<T>` export는 일반 유틸/기존 resilience test용으로 남아있다. 실제 API read path에서 새 사용이 생기지 않도록 source-contract test를 추가할지 검토한다.
- [ ] Search/explore nested object 중 Backend schema 대비 optional/required field drift가 더 없는지 다음 slice에서 audit한다.

## 관련

- [[Active Tasks]]
- [[Comment Response Guard 2026-06-08]]
- [[User Account Response Guard 2026-06-08]]

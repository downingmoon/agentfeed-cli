---
title: Search Explore Nested Contract Guard 2026-06-08
aliases:
  - Search Explore Contract Guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/evidence
---

# Search Explore Nested Contract Guard 2026-06-08

> [!success] 결과
> Search/Explore의 nested project payload를 Backend schema별로 분리 검증하고, Search response pagination을 strict contract로 전환했다. 이제 Search/Explore가 서로 다른 project shape를 일반 ProjectSummary fallback으로 뭉개지 않고, malformed successful payload를 `502 ApiError` contract diagnostic으로 fail-closed 처리한다.

## 변경 범위

- Search response
  - `pagination`을 permissive `normalizePagination`에서 strict `normalizeStrictPagination(..., searchContractError)`로 전환했다.
  - Backend `ProjectSearchResult` shape 전용 `normalizeSearchProjectResult()`를 추가했다.
  - Search project는 `slug`를 non-empty string으로 요구하고, Backend에 없는 `tags`, `last_worklog_at`, `stats`는 `null`로 명시 정규화한다.
- Explore response
  - Backend `ExploreProject` shape 전용 normalizer를 분리했다.
  - Trending project는 owner object, string slug, string-array tags, nullable ISO `last_worklog_at`를 검증한다.
- Contract tests
  - Search missing pagination fail-closed case 추가.
  - Search project null slug fail-closed case 추가.
  - Explore project null slug / malformed tags fail-closed case 추가.

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

- [ ] 실제 API read path에 permissive `normalizeListResponse<T>`가 재도입되지 않도록 source-contract test를 추가한다.
- [ ] Backend OpenAPI/client contract gate가 Search/Explore nested shape drift까지 더 직접적으로 잡도록 schema-field allowlist를 확장할 수 있는지 검토한다.

## 관련

- [[Active Tasks]]
- [[Strict Read List Envelope Guard 2026-06-08]]
- [[Comment Response Guard 2026-06-08]]

---
title: Comment Response Guard 2026-06-08
aliases:
  - Worklog Comment Contract Guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/evidence
---

# Comment Response Guard 2026-06-08

> [!success] 결과
> Worklog comment list/create 응답이 Backend `Comment` schema와 일치하도록 Frontend 타입과 runtime guard를 보강했다. 댓글 응답은 더 이상 permissive list normalizer로 조용히 빈 배열/부분 payload로 보정되지 않고, malformed successful payload를 `502 ApiError` contract diagnostic으로 fail-closed 처리한다.

## 변경 범위

- `ApiComment` contract를 Backend schema에 맞춰 `likes_count`, `updated_at`까지 포함하도록 갱신했다.
- `worklogs.comments()`
  - `normalizeListResponse<ApiComment>` permissive 경로를 제거했다.
  - strict pagination과 row-level `Comment` validation을 적용했다.
- `worklogs.addComment()`
  - comment 전용 `comment response contract mismatch` diagnostic을 사용하도록 분리했다.
  - author identity, `likes_count`, `created_at`, `updated_at`을 검증한다.
- `safeComments()` adapter
  - 렌더링 전 fallback adapter도 `likes_count`, `updated_at` 없는 row를 드롭하도록 타입 계약을 맞췄다.

## 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts src/lib/comment-adapter.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- OpenAPI contract gate: 75 operations, 70 client contracts, 40 response field contracts, 232 request body fields, 175 schema fields 통과.

## 후행 과제

- [ ] remaining read surfaces 중 아직 permissive `normalizeListResponse<T>`를 직접 쓰는 경계를 계속 audit한다.
- [ ] notification list/search/explore nested payload 중 Backend schema 대비 누락된 field가 없는지 추가 점검한다.

## 관련

- [[Active Tasks]]
- [[User Account Response Guard 2026-06-08]]
- [[Frontend Request Strict Contract 2026-06-08]]

---
title: Frontend Explore Page Fallback Removal 2026-06-08
aliases:
  - Explore page fallback removal
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# Frontend Explore Page Fallback Removal 2026-06-08

> [!success] 완료
> Explore page가 strict API normalizer를 통과한 tags/rising builders 데이터를 다시 page-local fallback으로 빈 목록/부분 목록 처리하지 않도록 정렬했다.

## 변경 요약

- `agentfeed-frontend/src/components/pages/ExplorePage.tsx`
  - `explore.tags()` 결과는 API normalizer에서 이미 검증된 배열이므로 `Array.isArray(...)? []`와 `flatMap` row drop을 제거했다.
  - `explore.get().rising_builders` 역시 strict normalized data를 직접 `map`한다.
  - malformed normalized payload를 page에서 다시 숨기는 대신 API boundary의 contract error가 visible error state로 연결되도록 유지했다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Explore tags가 `setTags(tagsResult.value)`를 사용하도록 source contract 추가.
  - tags/builders가 page-local `Array.isArray`/`flatMap` fallback으로 회귀하지 않도록 guard 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 계약상 의미

- Explore API/Tags API contract mismatch가 발생했을 때 Frontend가 빈 태그/빈 builder 영역으로 문제를 숨기지 않는다.
- API normalizer가 책임지는 schema 검증과 page가 책임지는 렌더링 책임을 분리했다.
- 사용자에게는 기존 Explore API error 또는 Tags section error로 문제가 드러난다.

## 후행 과제

- [ ] `SearchPage`의 prompt row page-local fallback도 API normalizer 이후 불필요한지 점검한다.

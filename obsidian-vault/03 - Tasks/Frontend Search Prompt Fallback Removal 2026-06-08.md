---
title: Frontend Search Prompt Fallback Removal 2026-06-08
aliases:
  - Search prompt fallback removal
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# Frontend Search Prompt Fallback Removal 2026-06-08

> [!success] 완료
> Search page가 strict API normalizer를 통과한 prompt rows를 다시 page-local fallback으로 빈 목록/부분 목록 처리하지 않도록 정렬했다.

## 변경 요약

- `agentfeed-frontend/src/components/pages/SearchPage.tsx`
  - `search.query()`가 이미 `normalizeSearchResponse`를 통해 `prompts` row schema를 검증하므로 page-local `Array.isArray(promptRows)`와 `flatMap` row drop을 제거했다.
  - prompt title/prompt/author fallback 재정규화를 제거하고 typed normalized rows를 직접 렌더링한다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Search prompts가 `result?.prompts ?? []`만 사용하도록 source contract 추가.
  - `Array.isArray(promptRows)` / `promptRows.flatMap(...)` 방식으로 malformed prompt rows를 숨기는 회귀를 금지했다.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 계약상 의미

- Search API의 prompt row contract가 깨졌을 때 Frontend가 “프롬프트 결과 없음”처럼 숨기지 않는다.
- API normalizer는 schema 검증, Search page는 렌더링에 집중하도록 책임을 분리했다.
- CLI-API-Frontend contract mismatch를 숨기지 않는 fail-closed 정책과 일치한다.

## 후행 과제

- [ ] `adaptPublicWorklogCards` / `adaptPublicProjectSummaries`처럼 UI domain adapter가 아직 invalid rows를 drop하는 경로가 있는지 별도 점검한다.

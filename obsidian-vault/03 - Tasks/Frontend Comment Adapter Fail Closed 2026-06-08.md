---
title: Frontend Comment Adapter Fail Closed 2026-06-08
aliases:
  - Comment adapter fail closed
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# Frontend Comment Adapter Fail Closed 2026-06-08

> [!success] 완료
> Worklog detail comments adapter가 malformed comment rows를 빈 댓글 목록이나 부분 목록으로 조용히 숨기지 않고, comments section의 visible error path로 fail-closed 하도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/comment-adapter.ts`
  - `safeComments`가 non-array payload를 `[]`로 바꾸지 않고 오류를 던진다.
  - malformed comment row를 `flatMap`으로 제거하지 않고 row index/field를 포함한 오류를 던진다.
  - `id`, `body`, `likes_count`, `created_at`, `updated_at`, `author.id|username`을 adapter boundary에서 검증한다.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid comment row와 GitHub avatar 보존을 확인한다.
  - malformed author/comment payload가 조용히 drop되지 않고 `Worklog comments API returned malformed rows` 오류를 내는지 확인한다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - comment adapter가 `return []` 또는 `flatMap` drop 방식으로 회귀하지 않도록 source contract를 추가했다.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 계약상 의미

- Worklog comments API contract가 깨졌을 때 댓글이 “없는 것처럼” 보이지 않는다.
- Worklog 본문은 유지하면서 comment section error로 사용자에게 문제를 명확히 보여준다.
- Frontend adapter 계층도 Backend/API contract mismatch를 숨기지 않는 Enterprise 품질 방향으로 정렬했다.

## 후행 과제

- [ ] `ExplorePage`, `SearchPage`의 page-local `flatMap`/`Array.isArray` fallback이 API normalizer 이후에도 필요한지 추가 점검한다.

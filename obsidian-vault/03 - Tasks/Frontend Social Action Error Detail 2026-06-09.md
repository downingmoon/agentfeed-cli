---
title: Frontend Social Action Error Detail 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/frontend
  - error-handling
  - enterprise-readiness
status: done
aliases:
  - Frontend Social Action Error Detail
---

# Frontend Social Action Error Detail 2026-06-09

> [!success] 완료
> 좋아요/북마크 optimistic social action 실패 시 generic 메시지만 보여주던 흐름을 보강해 API 상태별/네트워크별 사용자-visible detail을 유지한다.

## 배경

기존 `AppContext`의 `toggleLike` / `toggleBookmark` 실패 처리에서는 rollback과 generic error banner는 있었지만, 실제 실패가 권한 문제인지, rate limit인지, 서버 장애인지, 네트워크 문제인지 사용자에게 드러나지 않았다. Enterprise 수준 UX에서는 실패를 단순히 숨기지 않고 복구 가능한 단서를 제공해야 한다.

## 변경 사항

- `src/contexts/AppContext.tsx`
  - `socialActionFailureMessage` helper 추가.
  - `ApiError`는 status-specific display message를 보존한다.
  - `TypeError`는 네트워크 연결 확인 메시지를 보존한다.
  - 기타 Error는 bounded message를 붙인다.
  - optimistic rollback/pending cleanup 동작은 유지했다.
- `src/lib/page-source-contract.test.ts`
  - like/bookmark 실패가 helper를 통해 API/transport context를 노출하도록 source contract를 고정했다.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- src/lib/page-source-contract.test.ts src/lib/api-contract.test.ts
npm run lint
```

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

> [!note] 결과
> Frontend contract tests 통과, TypeScript lint 통과, OpenAPI contract gate 통과.

## 후행 과제

- Notifications read mutation도 현재 visible error는 있으나 실제 API detail은 generic copy로 변환된다. 다음 오류 UX 패스에서 같은 방식으로 status-specific detail 보존을 검토한다.

## 배포

> [!warning]
> 현재 goal 규칙에 따라 서버 배포는 수행하지 않았다.

---
title: Frontend Project Mutation Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - projects
status: done
related:
  - [[Frontend Feed Follow Error Detail 2026-06-09]]
  - [[Frontend Notification Action Error Detail 2026-06-09]]
---

# Frontend Project Mutation Error Detail 2026-06-09

> [!success] 완료
> Project detail의 owner edit/delete mutation 실패가 raw `Error.message`만 표시하지 않고, API·네트워크·런타임 오류를 구분해 사용자에게 명확히 표시하도록 개선했다.

## 문제

`src/components/pages/ProjectDetailPage.tsx`의 project update/delete catch는 다음처럼 처리됐다.

```ts
setMutationError(err instanceof Error ? err.message : String(err))
```

영향:

- `ApiError`는 메시지가 보존되지만, 네트워크 실패는 브라우저 기본 문구만 보여 사용자가 조치하기 어려움.
- update/delete action별 기본 복구 문구가 없어 오류 상황의 맥락이 약함.

## 변경 사항

- `src/components/pages/ProjectDetailPage.tsx`
  - `projectMutationFailureMessage(action, error)` helper 추가.
  - `ApiError`는 API display message를 보존.
  - `TypeError`는 네트워크 연결 확인 안내 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 표시.
  - update/delete 각각의 기본 action copy를 유지.
- `src/lib/page-source-contract.test.ts`
  - helper, ApiError/TypeError 처리, update/delete catch 경로를 source contract로 고정.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- src/lib/page-source-contract.test.ts src/lib/api-contract.test.ts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- Frontend contract/source tests: 통과
- Frontend typecheck/lint: 통과
- Dev OpenAPI contract gate: 통과

## 서버/배포

> [!warning]
> active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후행 과제

- 실제 브라우저 E2E에서 project update/delete fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- mutation error formatting 공통 helper 추출은 신규 추상화가 될 수 있어 이번 변경에는 포함하지 않았다.

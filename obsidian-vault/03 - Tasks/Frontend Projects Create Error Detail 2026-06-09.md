---
title: Frontend Projects Create Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - projects
status: done
related:
  - [[Frontend Project Mutation Error Detail 2026-06-09]]
  - [[Frontend Profile Follow Error Detail 2026-06-09]]
---

# Frontend Projects Create Error Detail 2026-06-09

> [!success] 완료
> Projects page의 create mutation 실패가 raw `Error.message`/`String(err)`만 표시하지 않고, API·네트워크·런타임 오류를 구분해 사용자에게 명확히 표시하도록 개선했다.

## 문제

`src/components/pages/ProjectsPage.tsx`의 create 실패 처리는 list를 blanking하지 않는 장점은 있었지만, 오류 메시지는 아래처럼 raw 값 중심이었다.

```ts
setCreateError(err instanceof Error ? err.message : String(err));
```

영향:

- API validation/conflict 메시지는 보존될 수 있지만 action-level 복구 문구가 없다.
- 네트워크 실패는 브라우저 기본 문구 중심이라 사용자가 조치하기 어렵다.
- Project detail의 update/delete mutation 오류 처리와 Projects create mutation 오류 처리 품질이 달랐다.

## 변경 사항

- `src/components/pages/ProjectsPage.tsx`
  - `PROJECT_CREATE_FAILURE_COPY` 추가.
  - `projectCreateFailureMessage(error)` helper 추가.
  - `ApiError`는 API display message를 보존.
  - `TypeError`는 네트워크 연결 확인 안내 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 표시.
  - create 실패 시 기존 list 보존과 pending 해제는 유지하면서 `setCreateError(projectCreateFailureMessage(err))`로 구체화.
- `src/lib/page-source-contract.test.ts`
  - Projects create 실패가 API/네트워크 detail을 포함하고, 기존 raw `Error/String` 출력을 재도입하지 않도록 source contract 보강.

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

- 실제 브라우저 E2E에서 Projects create API fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- Project create/update/delete mutation 오류 copy 공통화는 가능하지만, 현재는 신규 추상화보다 화면별 회귀방지 범위를 우선했다.

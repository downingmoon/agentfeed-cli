---
title: Frontend Worklog Mutation Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - worklogs
status: done
related:
  - [[Frontend Projects Create Error Detail 2026-06-09]]
  - [[Frontend Profile Follow Error Detail 2026-06-09]]
---

# Frontend Worklog Mutation Error Detail 2026-06-09

> [!success] 완료
> Worklog detail의 comment submit/report submit mutation 실패가 raw `Error`/`String(err)` 중심으로 노출되지 않고, API·네트워크·런타임 오류를 구분해 사용자에게 명확히 표시되도록 개선했다.

## 문제

`src/components/pages/WorklogDetailPage.tsx`의 댓글 등록과 신고 제출 실패 처리는 아래처럼 raw Error 객체 또는 문자열 fallback 중심이었다.

```ts
setCommentSubmitError(err instanceof Error ? err : new Error(String(err)))
setReportError(err instanceof Error ? err : new Error(String(err)))
```

또한 렌더링 단계에서 prefix를 붙여 action 맥락을 보완했지만, 네트워크 실패와 API validation/permission 실패를 분리해 안내하지 못했다.

## 변경 사항

- `src/components/pages/WorklogDetailPage.tsx`
  - `COMMENT_SUBMIT_FAILURE_COPY`, `REPORT_SUBMIT_FAILURE_COPY` 추가.
  - `worklogMutationFailureMessage(base, error)` helper 추가.
  - `ApiError`는 API display message를 보존.
  - `TypeError`는 네트워크 연결 확인 안내 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 표시.
  - 댓글 등록/신고 제출 실패 시 기존 pending 해제와 optimistic-safe state는 유지하면서 helper 결과를 사용자에게 표시.
- `src/lib/page-source-contract.test.ts`
  - Worklog detail comment/report submit 실패가 API/네트워크 detail을 포함하고, 기존 raw `Error/String` 출력을 재도입하지 않도록 source contract 보강.

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

- 실제 브라우저 E2E에서 comment/report submission fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- Comment/report/load-more 등 Worklog detail 오류 표시 UI를 공통 alert 컴포넌트로 정리할 수 있지만, 이번 패스에서는 신규 추상화보다 회귀방지와 사용자-visible 오류 구체화를 우선했다.

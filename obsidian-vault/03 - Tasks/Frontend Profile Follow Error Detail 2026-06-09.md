---
title: Frontend Profile Follow Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - profile
status: done
related:
  - [[Frontend Feed Follow Error Detail 2026-06-09]]
  - [[Frontend Project Mutation Error Detail 2026-06-09]]
---

# Frontend Profile Follow Error Detail 2026-06-09

> [!success] 완료
> Profile page의 follow/unfollow mutation 실패가 raw `Error.message`만 표시하지 않고, API·네트워크·런타임 오류를 구분해 사용자에게 명확히 표시하도록 개선했다.

## 문제

`src/components/pages/ProfilePage.tsx`의 follow/unfollow 실패 처리는 optimistic rollback은 수행했지만 오류 표시는 아래 형태였다.

```ts
setFollowError(err instanceof Error ? err : new Error(String(err)))
```

영향:

- API 오류는 우연히 message가 보존되지만 action-level 복구 문구가 없다.
- 네트워크 실패는 브라우저 기본 문구 중심이라 사용자가 조치하기 어렵다.
- Feed의 rising-builder follow 오류 처리와 Profile follow 오류 처리의 품질이 달랐다.

## 변경 사항

- `src/components/pages/ProfilePage.tsx`
  - `PROFILE_FOLLOW_FAILURE_COPY` 추가.
  - `profileFollowFailureMessage(error)` helper 추가.
  - `ApiError`는 API display message를 보존.
  - `TypeError`는 네트워크 연결 확인 안내 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 표시.
  - 실패 시 optimistic follow state rollback은 유지하면서 `setFollowError(new Error(profileFollowFailureMessage(err)))`로 구체화.
- `src/lib/page-source-contract.test.ts`
  - Profile follow 실패가 API/네트워크 detail을 포함하고, 기존 raw `Error/String` 출력을 재도입하지 않도록 source contract 보강.

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

- 실제 브라우저 E2E에서 Profile follow/unfollow API fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- Follow 오류 메시지 helper를 Feed/Profile 공통으로 추출하는 것은 가능하지만, 현재는 신규 추상화보다 국소 회귀방지 범위를 우선했다.

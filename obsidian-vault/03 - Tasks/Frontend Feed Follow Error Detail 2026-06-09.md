---
title: Frontend Feed Follow Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - social
status: done
related:
  - [[Frontend Social Action Error Detail 2026-06-09]]
  - [[Frontend Notification Action Error Detail 2026-06-09]]
---

# Frontend Feed Follow Error Detail 2026-06-09

> [!success] 완료
> Public Feed의 rising builder follow/unfollow 실패가 고정 문구만 표시하지 않고, API·네트워크·런타임 오류의 구체적인 원인을 사용자에게 함께 노출하도록 개선했다.

## 문제

`src/components/pages/FeedPage.tsx`의 rising builder follow action은 실패 시 optimistic state를 rollback했지만, 오류 메시지는 항상 아래 고정 문구였다.

```text
Follow 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.
```

영향:

- 권한/세션/API contract/네트워크 오류가 모두 같은 메시지로 보임.
- 사용자가 재로그인·네트워크 확인·API 상태 확인 중 어떤 조치를 해야 하는지 알기 어려움.

## 변경 사항

- `src/components/pages/FeedPage.tsx`
  - `ApiError`를 명시적으로 처리해 API display message를 보존.
  - `TypeError` 네트워크 실패는 연결 확인 안내를 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 원인을 표시.
  - 기존 optimistic update, rollback, pending lock은 유지.
- `src/lib/page-source-contract.test.ts`
  - `followingBuilderFailureMessage()`와 ApiError/TypeError 상세 처리 경로를 source contract로 고정.

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

- 실제 브라우저 E2E에서 follow API fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- 추후 mutation error UX 공통 helper를 만들 수 있지만, 현재는 신규 추상화 추가 없이 page-local 개선으로 제한했다.

---
title: User Avatar Residual Coverage 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - ui
  - avatar
  - completed
status: completed
---

# User Avatar Residual Coverage 2026-06-08

> [!success]
> 남아 있던 text-only 사용자 identity 표면을 정리하고, 댓글 author payload가 GitHub avatar를 잃거나 `unknown-user` fallback으로 조용히 변질되지 않도록 계약을 고정했다.

## 범위

- [[Integration - CLI Backend Frontend]]
- 이전 avatar pass인 [[Frontend GitHub Avatar Coverage 2026-06-08]] 이후 잔여 사용자 표면만 추가 점검.
- 서버 배포/인프라/CICD는 이번 범위에서 제외.

## 발견한 gap

1. `/cli/authorize` ready 상태의 로그인 계정 카드
   - `auth.me()` 응답에는 `avatar_url`이 있지만 화면은 이름/username만 text-only로 표시했다.
   - CLI 승인 플로우는 사용자가 “내 GitHub 계정으로 이 터미널을 승인한다”는 신뢰 판단을 하는 화면이므로 avatar 표시가 필요하다.

2. `/worklogs/:id` 댓글 목록
   - 댓글 UI 자체는 `Avatar`를 사용했지만, 기존 `safeComments()`가 `author` truthy 여부만 검사했다.
   - malformed `{ author: {} }` 같은 payload가 들어오면 `adaptUser()`가 `unknown-user` fallback을 만들 수 있어 실제 GitHub identity/avatar가 없는 댓글을 조용히 정상처럼 렌더링할 위험이 있었다.

## 수정

- `src/components/pages/CliAuthorizePage.tsx`
  - ready account card에서 `Avatar user={adaptUser(state.user)}`를 렌더링.
  - GitHub login 후 받은 `auth.me().avatar_url`이 승인 화면에 직접 표시되도록 보강.

- `src/lib/comment-adapter.ts`
  - 댓글 전용 `safeComments()`와 `appendUniqueComments()`를 공용 adapter로 분리.
  - 댓글 author는 `id` 또는 `username` 중 하나 이상의 usable identity를 요구.
  - `avatar_url`, `github_url`, `display_name` 등 공개 profile field를 normalized 상태로 보존.
  - malformed author/comment row는 렌더링 전 제거.

- `src/components/pages/WorklogDetailPage.tsx`
  - inline author-truthy-only validation 제거.
  - 공용 comment adapter를 통해 댓글을 적재/append/submit 결과에 일관 적용.

## Regression coverage

- `src/lib/api-contract.test.ts`
  - 댓글 author의 `avatar_url` 보존.
  - author identity 없는 malformed 댓글 row 제거.
  - comment append dedupe by `id`.

- `src/lib/page-source-contract.test.ts`
  - `/cli/authorize` ready account card가 `Avatar` + `adaptUser()`를 사용하도록 고정.
  - `/worklogs/:id`가 공용 comment adapter를 import하도록 고정.
  - inline `safeComments()`/`appendUniqueComments()` 회귀 금지.

## Verification

- RED
  - `npm test` 실패: `Cannot find module './comment-adapter'`
- GREEN
  - Frontend `npm test` ✅
  - Frontend `npm run lint` ✅
  - Cross-repo `bash scripts/test-all.sh` ✅
    - CLI Vitest/release preflight/audit 통과
    - Frontend typecheck/contracts/mock API compatibility/build/audit 통과
    - Backend ruff/pytest/offline Alembic chain 통과

## Follow-up

- `/search/suggestions`는 아직 user suggestion UI가 없으므로 이번 수정 대상이 아니다.
- 향후 user suggestion row를 화면에 렌더링하면 `avatar_url` payload와 `Avatar` 렌더링 계약을 함께 추가해야 한다.
- 서버 배포는 목표 규칙에 따라 수행하지 않았다.

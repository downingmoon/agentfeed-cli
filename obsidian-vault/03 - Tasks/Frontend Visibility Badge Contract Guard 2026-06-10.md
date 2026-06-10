---
title: Frontend Visibility Badge Contract Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/commercial-readiness
status: done
---

# Frontend Visibility Badge Contract Guard 2026-06-10

> [!success]
> Project visibility는 adapter에서 이미 `ProjectVisibility` union으로 정규화되므로, UI badge 호출부에서 다시 `'public' | 'unlisted' | 'private'`로 assertion하지 않도록 정리했다.

## 문제

- `ProjectDetailPage`와 `SearchPage`가 `VisibilityBadge`에 `project.visibility as 'public' | 'unlisted' | 'private'`를 넘겼다.
- 이 패턴은 backend/API/frontend visibility contract가 깨졌을 때 UI 레이어가 타입 오류를 숨길 수 있다.
- `VisibilityBadge` 자체가 local literal union을 재선언하고 있어 shared `ProjectVisibility` 타입과 drift 가능성이 있었다.

## 수정

- `src/components/ui/VisibilityBadge.tsx`
  - prop 타입을 local literal union에서 shared `ProjectVisibility`로 변경.
- `src/components/pages/ProjectDetailPage.tsx`
  - visibility badge 호출부 assertion 제거.
- `src/components/pages/SearchPage.tsx`
  - visibility badge 호출부 assertion 제거.
- `src/lib/project-visibility-source-contract.test.ts`
  - `SearchPage`를 검사 대상에 포함.
  - `VisibilityBadge v={... as ...}` 패턴 재도입 시 실패하도록 guard 추가.

## 검증

- Red 확인
  - 확장된 source contract가 기존 `ProjectDetailPage.tsx`의 visibility badge assertion에서 실패함 확인.
- Green 확인
  - `npm run test:contracts`
  - `npm run lint`
  - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_TELEMETRY_DISABLED=1 npm run ci`
  - `node scripts/check-openapi-contract.mjs`
- Manual QA
  - `next dev -p 3102` 로컬 서버 실행.
  - Playwright route mock으로 `/search?q=visibility`의 public project result를 렌더링.
  - `Search Visibility Project`가 보이고 `.badge-visibility` 텍스트가 `public`인 것을 확인.

## 검증 제약

> [!warning]
> TypeScript LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행되지 않았다. 대신 `tsc --noEmit` 기반 lint/CI로 타입 검증했다.

## 배포

- 서버 배포는 하지 않았다.

## 후속 후보

- `WorklogReviewPage`의 privacy finding type/severity parser assertion 제거.
- `src/lib/adapters.ts`의 `_author` 반환 assertion을 명시 타입으로 축소.
- `src/components/worklog/worklogAuthor.ts`의 `_author` 접근 assertion을 adapter return type과 맞춰 제거할 수 있는지 검토.

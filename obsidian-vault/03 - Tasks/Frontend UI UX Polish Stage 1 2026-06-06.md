---
title: Frontend UI UX Polish Stage 1 2026-06-06
date: 2026-06-06
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - project/evidence
status: completed
related:
  - "[[Active Tasks]]"
---

# Frontend UI UX Polish Stage 1 2026-06-06

## 목표

현재 AgentFeed의 dark, Linear/Vercel-inspired 톤앤매너는 유지하면서, 상용 서비스에서 거슬릴 수 있는 전역 UI/UX rough edge를 1차로 줄였다.

## Audit 기준

- 기존 stack 유지: Next.js 15, React 19, vanilla CSS 변수 기반 design system.
- 백엔드/기능 계약 변경 금지.
- 시각 품질 우선순위: typography → surface depth → interactive state → loading state → responsive layout.
- 접근성 기본값: skip link, focus-visible, semantic collision 회피, reduced motion 존중.

## 변경 요약

- Inter-only 인상을 줄이기 위해 display/body/mono font stack을 `Geist` / `Geist Mono` 중심으로 교체하고, 중복 CSS `@import`를 제거했다.
- root layout에 skip link를 추가하되 페이지 내부 `<main>`과 중첩되지 않도록 `#main-content` div target을 사용했다.
- 전역 color-scheme, smooth scroll, text-size-adjust, subtle grain overlay를 추가해 표면감을 개선했다.
- nav active/hover state를 명확히 하고, card base에 inner highlight와 미세 shadow를 추가했다.
- Feed desktop layout을 `1fr + 340px sidebar` 구조로 고정해 sidebar가 과도하게 넓어지는 문제를 줄였다.
- Feed loading을 text-only 상태에서 worklog card 형태의 skeleton list로 바꿨다.
- `transition: all`을 구체 transition으로 축소했다.
- Suspense/loading copy의 ASCII `...`를 typographic ellipsis `…`로 정리했다.
- Header search placeholder를 더 polished한 ellipsis copy로 조정했다.

## 검증 evidence

- `npm run lint`: 통과.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`: 통과.
- Playwright 수동 시각 smoke:
  - `http://127.0.0.1:3101/` desktop landing 접근 및 screenshot 확인.
  - `http://127.0.0.1:3101/feed` mobile 390×844 접근 및 screenshot 확인.
  - 확인 후 Playwright browser close 수행.
  - Next dev server 종료 및 잔여 `next dev`/검색 프로세스 없음 확인.

> [!note]
> Playwright console에는 remote/server-test API 호출 관련 error count가 표시됐다. 현재 stage의 변경 대상은 전역 UI polish이며, build/typecheck와 화면 접근은 통과했다. 다음 visual QA stage에서 API-backed page 상태와 console noise를 별도로 재확인한다.

## 다음 stage 후보

- Landing hero/preview card의 inline style을 줄이고 reusable premium section/card primitive로 정리.
- Feed empty/error/following-auth state를 더 productized된 onboarding surface로 개선.
- Worklog detail/review page의 action cluster와 mobile hierarchy 재점검.
- Settings/Projects form label/id, helper/error text, destructive action hierarchy polish.

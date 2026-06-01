---
title: Commercial Readiness Hardening - Frontend Worklog Card Semantic Controls 2026-06-01
aliases:
  - Worklog card semantic controls
  - Frontend worklog card stretched link hardening
tags:
  - agentfeed/frontend
  - agentfeed/accessibility
  - agentfeed/commercial-readiness
  - worklog-card
status: done
created: 2026-06-01
frontend_commit: 030e54a
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - Frontend Feed Sidebar Accessibility 2026-06-01]]"
---

# Commercial Readiness Hardening - Frontend Worklog Card Semantic Controls 2026-06-01

> [!success]
> Feed/Search/Explore/Profile/Project worklog cards now open through a real stretched link instead of turning the `<article>` wrapper into a fake link around nested action buttons.

## 목표

Core feed cards are the product's main discovery surface. They must keep full-card navigation while preserving native semantics for like/bookmark/comment/share controls.

## 변경 사항

- `WorklogCardA/B/C`에서 `article role="link" tabIndex={0}`와 custom keydown navigation을 제거했습니다.
- 각 카드에 `href=/worklogs/{id}`를 가진 `.cardOpenLink` stretched anchor를 추가했습니다.
- Existing router callbacks are preserved for normal primary clicks via `openWorklogFromCardLink()`.
- Modified clicks (`Cmd/Ctrl/Shift/Alt`) keep browser-native new-tab/window behavior.
- Like/bookmark/comment/share buttons remain sibling native buttons above the stretched link layer.
- Old keyboard helper `worklog-card-accessibility.ts` was removed because native anchor semantics cover Enter activation.

## 계약

- Worklog card containers are non-interactive `<article>` landmarks.
- Card navigation is a sibling stretched link with `aria-label="Open worklog: ..."`.
- The link URL uses shared `pathSegment(id)` sanitization.
- Action controls remain labeled buttons and are not descendants of the navigation link.
- Contract tests reject reintroducing `role="link" tabIndex={0}` on the card article.

## 검증 증거

- Frontend: `npm run test:contracts` ✅
- Frontend: `npm run lint` ✅
- Frontend: `npm run ci` ✅
- Frontend: `npm audit --omit=dev --audit-level=moderate` → 0 vulnerabilities ✅
- Frontend: `git diff --check` ✅
- Cross-repo: `agentfeed-dev make test` ✅
  - OpenAPI contract gate passed: 69 backend operations / 66 client contracts.
  - CLI tests: 272 passed.
  - Frontend CI/build passed.
  - Backend tests: 246 passed, Alembic offline chain generated successfully.

## 커밋

- Frontend: `030e54a` — `Use semantic stretched links for worklog cards`

## 남은 리스크

> [!warning]
> Manual screen-reader/browser pointer smoke was not run in a live browser. Static contracts, typecheck, production build, and cross-repo gates passed.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend worklog card semantic controls]]
- [[Commercial Readiness Hardening - Frontend Feed Sidebar Accessibility 2026-06-01]]
- [[Active Tasks#P1 후보]]

---
title: Commercial Readiness Hardening - Frontend Native Profile Navigation Links 2026-06-01
aliases:
  - Frontend native profile navigation links
  - Profile project and author native links
tags:
  - agentfeed/frontend
  - agentfeed/accessibility
  - agentfeed/commercial-readiness
status: done
created: 2026-06-01
frontend_commit: b02b82f
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - Frontend Worklog Card Semantic Controls 2026-06-01]]"
---

# Commercial Readiness Hardening - Frontend Native Profile Navigation Links 2026-06-01

> [!success]
> 남아 있던 fake `role="link"` navigation surfaces를 실제 Next `Link`로 교체했습니다.

## 목표

Frontend discovery/detail 화면에서 URL이 있는 navigation은 native link semantics를 사용해야 합니다. Custom `role="link"` + `tabIndex` + keydown handler는 browser 기본 동작과 접근성 품질을 약화시키고, modified-click/new-tab 동작도 깨지기 쉽습니다.

## 변경 사항

- `ProfilePage` project cards:
  - `div role="link" tabIndex={0}` 제거.
  - `Link href={projectHref(username, p.slug)}`로 owner-aware project route를 직접 노출.
  - Custom `openProjectOnKeyDown` 제거.
- `WorklogDetailPage` author row:
  - `div role="link" tabIndex={0}` 제거.
  - `Link href=/profile/{username}`로 author profile route를 직접 노출.
  - Custom `openAuthorProfileOnKeyDown` 제거.
- `page-source-contract.test.ts`가 fake-link 재도입을 거부하고 native link route/accessibility contract를 요구하도록 변경.

## 계약

- Profile project card는 native `Link`이며 `projectHref(username, p.slug)`를 사용합니다.
- Worklog detail author row는 native `Link`이며 shared `pathSegment(u.username)`으로 route segment를 sanitize합니다.
- 두 navigation target 모두 accessible name을 유지합니다.
- Enter activation, focusability, modified-click behavior는 browser/Next Link 기본 semantics가 담당합니다.

## 검증 증거

- RED: contract 변경 직후 `npm run test:contracts`가 기존 fake role-link profile project card에서 실패 ✅
- Frontend: `npm run test:contracts` ✅
- Frontend: `npm run lint` ✅
- Frontend: `npm run ci` ✅
- Frontend: `npm audit --omit=dev --audit-level=moderate` → 0 vulnerabilities ✅
- Frontend: `git diff --check` ✅
- Cross-repo: `agentfeed-dev make test` ✅
  - OpenAPI contract gate passed: 69 backend operations / 66 client contracts.
  - CLI tests: 272 passed.
  - Frontend production build passed.
  - Backend tests: 246 passed, Alembic offline migration chain generated.

## 병렬 evidence

> [!info]
> Sidecar evidence lane identified the next cross-repo readiness candidate: `agentfeed-dev/scripts/smoke-e2e.sh` still waits on backend `/health` liveness while Compose/readiness contracts already use `/health/ready`.

## 커밋

- Frontend: `b02b82f` — `Use native links for profile navigation surfaces`

## 남은 리스크

> [!warning]
> Manual browser/screen-reader smoke was not run. Static contracts, typecheck, production build, audit, and cross-repo gates passed.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend native profile navigation links]]
- [[Commercial Readiness Hardening - Frontend Worklog Card Semantic Controls 2026-06-01]]
- [[Active Tasks#P1 후보]]

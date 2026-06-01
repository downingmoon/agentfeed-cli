---
title: Commercial Readiness Hardening - Frontend Project Route Dev Runtime 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/dev
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Frontend project route dev runtime hardening
  - Project route dynamic segment conflict fix
---

# Commercial Readiness Hardening - Frontend Project Route Dev Runtime 2026-06-01

> [!success]
> 실제 `agentfeed-dev make up`에서 Frontend container가 Next dynamic route 충돌로 restart loop에 빠지는 문제를 발견하고, project detail route를 단일 catch-all route로 통합해 dev/prod runtime을 정렬했습니다.

## 발견 증거

- `make smoke-e2e` 첫 실행은 stack 미기동으로 실패했습니다.
- `make up`으로 stack을 올리자 Backend/Postgres는 healthy였지만 Frontend가 restart loop에 빠졌습니다.
- Frontend container log:
  - `You cannot use different slug names for the same dynamic path ('owner' !== 'slug')`
- 원인 route:
  - Frontend `src/app/projects/[slug]/page.tsx`
  - Frontend `src/app/projects/[owner]/[slug]/page.tsx`

## 결과

- 두 project detail route를 `src/app/projects/[...projectPath]/page.tsx` 하나로 통합했습니다.
- `/projects/:slug` legacy route는 `projectPath.length === 1`일 때 `<ProjectDetailPage slug={...} />`로 유지합니다.
- `/projects/:owner/:slug` canonical owner-aware route는 `projectPath.length === 2`일 때 `<ProjectDetailPage owner={...} slug={...} />`로 유지합니다.
- malformed project path는 `notFound()`로 fail closed 처리합니다.
- `page-source-contract.test.ts`가 충돌 route 재도입을 차단하고 catch-all branch 계약을 검증합니다.
- stale `.next/types`가 삭제된 route를 계속 참조해 `npm run lint`를 깨는 문제를 막기 위해 `prelint`에서 `.next/types`를 정리합니다.
- `smoke-e2e.sh`가 legacy `/projects/{id}`뿐 아니라 owner-aware `/projects/{username}/{slug}` hydrated route도 검증합니다.

## Product contract

> [!important]
> Frontend dev runtime은 production build만큼 상용화 품질의 일부입니다. `make up`/`make smoke-e2e`가 안정적으로 통과해야 CLI → Backend → Frontend local onboarding이 신뢰 가능합니다.

## 변경 파일

- Frontend: `src/app/projects/[...projectPath]/page.tsx`
- Frontend: removed `src/app/projects/[slug]/page.tsx`
- Frontend: removed `src/app/projects/[owner]/[slug]/page.tsx`
- Frontend: `src/lib/page-source-contract.test.ts`
- Frontend: `scripts/clean-next-types.mjs`
- Frontend: `package.json`
- Dev: `scripts/smoke-e2e.sh`

## 검증 증거

- `agentfeed-dev make up` → passed after route fix, stack ready with Frontend `http://localhost:3001` and Backend readiness `http://localhost:8001/health/ready`.
- Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` → passed.
- Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` route output shows `/projects/[...projectPath]`.
- Dev live smoke: `bash -n scripts/smoke-e2e.sh && make smoke-e2e && git diff --check` → passed.
- Cross-repo: `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 20 test files / 272 tests passed, typecheck, release preflight, npm audit.
  - Frontend: typecheck, contract tests, production build, npm audit.
  - Backend: ruff, 246 tests passed, Alembic offline migration chain.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend project route dev runtime]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Readiness Probe Semantics 2026-06-01]]
- [[Commercial Readiness Hardening - Frontend Native Profile Navigation Links 2026-06-01]]

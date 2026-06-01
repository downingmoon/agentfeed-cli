---
title: Commercial Readiness Hardening - Authenticated Frontend Account Smoke 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/dev
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Authenticated frontend account smoke coverage
  - Browser cookie authenticated account DOM smoke
---

# Commercial Readiness Hardening - Authenticated Frontend Account Smoke 2026-06-01

> [!success]
> Dev E2E smoke가 API bearer 호출과 public DOM만 확인하던 빈틈을 막고, 실제 브라우저에 Backend `access_token` cookie를 주입해 authenticated account surface가 hydration 후 정상 렌더링되는지 검증하도록 보강했습니다.

## 발견한 gap

- `smoke-e2e.sh`는 seeded user와 `ACCESS_TOKEN`으로 Backend API review/publish/feed 흐름을 검증했습니다.
- Public Frontend DOM은 headless Chrome으로 hydration까지 확인했습니다.
- 하지만 Dashboard/Settings/Notifications/Review 같은 authenticated Frontend 화면은 실제 browser cookie auth bootstrap을 통과하는지 검증하지 않았습니다.
- Frontend `apiFetch()`는 `credentials: 'include'`를 사용하므로, browser smoke는 Authorization header가 아니라 Backend origin cookie를 주입해야 실제 runtime 계약과 일치합니다.

## 결과

- `browser-dom-dump.mjs`에 smoke 전용 cookie injection 옵션을 추가했습니다.
  - `--cookie name=value`
  - `--cookie-url URL`
- Chrome DevTools Protocol `Network.setCookie`로 page navigation 전에 Backend `access_token` cookie를 설정합니다.
- `smoke-e2e.sh`에 `dump_authenticated_browser_dom()` helper를 추가했습니다.
- Authenticated hydrated DOM 검증 대상:
  - `/worklogs/{id}/review`
  - `/dashboard`
  - `/settings`
  - `/notifications`
- Signed-out fallback이 섞이지 않도록 다음 문구 부재도 확인합니다.
  - `로그인 상태를 확인하는 중`
  - `로그인 페이지로 이동하는 중`
  - `GitHub 로그인`

## Product contract

> [!important]
> AgentFeed의 핵심 흐름은 CLI upload 후 사용자가 Frontend에서 private review/account 화면을 신뢰하고 조작하는 것입니다. Dev smoke는 Backend JWT가 브라우저 cookie auth로 Frontend AppContext까지 연결되는지를 반드시 증명해야 합니다.

## 변경 파일

- Dev: `scripts/browser-dom-dump.mjs`
- Dev: `scripts/smoke-e2e.sh`
- Dev: `scripts/test-all.sh`

## 검증 증거

- `agentfeed-dev`: `bash -n scripts/smoke-e2e.sh` → passed.
- `agentfeed-dev`: `node --check scripts/browser-dom-dump.mjs` → passed.
- `agentfeed-dev`: `make smoke-e2e` → passed.
  - `== Verifying authenticated frontend account DOM ==`
  - `== E2E smoke passed ==`
- `agentfeed-dev`: `./scripts/test-all.sh` → passed.
  - OpenAPI contract gate: 69 operations, 66 client contracts, 3 backend-only.
  - CLI: 20 test files / 272 tests passed, typecheck, release preflight, npm audit.
  - Frontend: typecheck, contract tests, production build, npm audit.
  - Backend: ruff, 246 tests passed, Alembic offline migration chain.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Authenticated frontend account smoke]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Frontend Project Route Dev Runtime 2026-06-01]]
- [[Commercial Readiness Hardening - Browser Login API Bounds and Security Headers 2026-05-31]]

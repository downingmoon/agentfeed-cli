---
title: Commercial Readiness Hardening - Frontend Signout Click Smoke 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/dev
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Frontend Sign out click smoke
  - Browser UI signout revocation smoke
---

# Commercial Readiness Hardening - Frontend Signout Click Smoke 2026-06-01

> [!success]
> Direct API logout smoke를 넘어, 실제 Frontend Header의 `Sign out` 버튼 클릭이 Backend logout을 호출하고 old browser JWT를 무효화하는지 브라우저 E2E로 검증했습니다.

## 발견한 gap

- Dev smoke는 `curl -b access_token=... POST /v1/auth/logout`로 Backend session cutoff를 검증했습니다.
- 하지만 사용자가 실제로 누르는 Frontend Header `Sign out` button이 같은 보안 계약을 만족하는지는 smoke에서 증명하지 않았습니다.
- 기존 `browser-dom-dump.mjs`는 cookie 주입과 DOM assertion만 지원했고, hydration 이후 click action을 수행할 수 없었습니다.

## 결과

- `browser-dom-dump.mjs`에 bounded CDP click support를 추가했습니다.
  - `--click-selector`
  - `--click-text`
  - `--after-click-expect`
- Header `Sign out` button에 stable accessible name `aria-label="Sign out"`을 추가했습니다.
- Dev smoke는 `/feed`에서 authenticated header가 `Sign out`을 렌더링할 때까지 기다린 뒤 실제 button을 클릭합니다.
- 클릭 후 header가 `Sign in` / `Get started`로 전환되고 session failure alert가 뜨지 않는지 검증합니다.
- 클릭으로 로그아웃된 old JWT가 cookie와 bearer 양쪽 `/v1/auth/me`에서 `401`인지 다시 검증합니다.

## Product contract

> [!important]
> 상용 품질의 logout 검증은 endpoint 단독 호출이 아니라 실제 사용자가 누르는 UI control에서 시작해야 합니다. Smoke는 Frontend button → `auth.logout()` → Backend session cutoff → old token rejection까지 이어지는 전체 경로를 증명합니다.

## 변경 파일

- Frontend: `src/components/layout/Header.tsx`
- Frontend: `src/lib/page-source-contract.test.ts`
- Dev: `scripts/browser-dom-dump.mjs`
- Dev: `scripts/smoke-e2e.sh`
- Dev: `scripts/test-all.sh`

## 검증 증거

- Frontend: `npm run test:contracts` → passed.
- Frontend: `npm run lint` → passed.
- Dev syntax/static: `bash -n scripts/smoke-e2e.sh && node --check scripts/browser-dom-dump.mjs && git diff --check` → passed.
- Dev live smoke: `make smoke-e2e` → passed.
  - `== Verifying frontend Sign out click revokes the browser session ==`
  - `== E2E smoke passed ==`
- Cross-repo: `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 20 files / 272 tests passed, typecheck, release preflight, npm audit.
  - Frontend: typecheck, contract tests, production build, npm audit.
  - Backend: ruff, 246 tests passed, Alembic offline migration chain.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend Sign out click smoke]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Session Logout Revocation Smoke 2026-06-01]]
- [[Commercial Readiness Hardening - Authenticated Frontend Account Smoke 2026-06-01]]

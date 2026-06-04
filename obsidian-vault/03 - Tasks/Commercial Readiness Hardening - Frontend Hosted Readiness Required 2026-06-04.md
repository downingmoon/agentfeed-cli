---
title: Commercial Readiness Hardening - Frontend Hosted Readiness Required 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/ci
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Frontend hosted readiness required
---

# Commercial Readiness Hardening - Frontend Hosted Readiness Required 2026-06-04

## 목적

Frontend CI는 production API URL이 설정되어도 `AGENTFEED_HOSTED_FRONTEND_URL` 또는 `AGENTFEED_ROOT_SMOKE_URL`이 없으면 hosted readiness preflight를 건너뛸 수 있었다. GitHub Actions workflow는 현재 hosted URL을 제공하지만, 수동/배포 파이프라인이 늘어날 때 같은 보장이 빠지면 루트 `/login` redirect나 review origin mismatch가 배포 전 게이트를 우회할 수 있다.

> [!important]
> Hosted CI/deploy 환경에서는 production API compatibility만으로 충분하지 않다. 배포된 frontend root와 review origin까지 같이 증명해야 상용 릴리스 게이트가 된다.

## 변경 요약

- `agentfeed-frontend/scripts/run-ci.mjs`
  - production API compatibility가 필요한 hosted CI/deploy 환경에서 hosted frontend readiness URL이 없으면 npm step 실행 전 fail-closed 한다.
  - 허용 URL은 `AGENTFEED_HOSTED_FRONTEND_URL` 또는 `AGENTFEED_ROOT_SMOKE_URL`이다.
  - `shouldVerifyProductionApiCompatibility()` 결과를 한 번 계산해 hosted readiness / production compatibility / build gate에서 일관되게 사용한다.
- `agentfeed-frontend/scripts/run-ci.contract.test.mjs`
  - `GITHUB_ACTIONS=true` + production API URL + hosted URL 누락 시 npm 호출 전 실패하는 contract 추가.

## 검증

> [!success] Fresh local verification
> - `node scripts/run-ci.contract.test.mjs` ✅
> - `npm run lint` ✅
> - `npm run test:contracts` ✅
> - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` ✅

## 남은 외부 차단 조건

- 이 변경은 hosted readiness URL 누락 우회를 막는 CI gate hardening이다.
- 현재 hosted CI 실패 원인은 여전히 실제 외부 상태다.
> [!failure]
> - `api.agentfeed.dev` DNS `ENOTFOUND`
> - `https://agentfeed.dev/` root `307 /login`

## 관련 노트

- [[Commercial Readiness Hardening - Hosted Readiness Diagnostics 2026-06-04]]
- [[Commercial Readiness Hardening - Frontend Project Detail Stats Source 2026-06-04]]
- [[Commercial Readiness Hardening - Frontend Core API Compatibility Probes 2026-06-03]]
- [[Active Tasks]]

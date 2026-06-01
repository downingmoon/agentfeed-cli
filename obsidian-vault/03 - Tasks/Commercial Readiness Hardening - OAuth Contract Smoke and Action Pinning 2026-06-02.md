---
title: Commercial Readiness Hardening - OAuth Contract Smoke and Action Pinning 2026-06-02
aliases:
  - OAuth Contract Smoke and Action Pinning
  - CLI OAuth Contract Smoke
  - GitHub Actions SHA Pinning Gate
tags:
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/supply-chain
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-02
updated: 2026-06-02
---

# Commercial Readiness Hardening - OAuth Contract Smoke and Action Pinning 2026-06-02

## 목적

[[Commercial Readiness Hardening - Hosted OAuth Live Smoke Harness 2026-06-02]]는 실제 GitHub browser consent가 필요한 수동 smoke를 one-command로 고정했습니다. 이번 작업은 그 전 단계의 OAuth callback/session exchange 계약을 credential-free 자동 smoke로 고정하고, cross-repo GitHub Actions `uses:` ref가 mutable tag로 회귀하지 않도록 SHA pinning gate를 추가했습니다.

> [!success]
> 자동화 가능한 OAuth start → mocked GitHub callback → Frontend approve → CLI exchange → ingestion token validity 경로는 `make smoke-oauth-contract`와 `./scripts/test-all.sh`에서 검증됩니다.

## 변경 사항

### agentfeed-dev

- `scripts/smoke-oauth-contract.sh`
  - Backend ASGI app에 mocked GitHub token/user provider를 주입합니다.
  - `/v1/auth/github?next=/cli/authorize?session_id=...` start redirect가 GitHub authorize URL, configured `client_id`, configured `redirect_uri`, state cookie, URL-visible `session_id` 제거를 만족하는지 검증합니다.
  - mocked callback이 access cookie를 설정하고 OAuth state cookie를 clear하는지 검증합니다.
  - browser cookie client가 실제 CLI auth session approve를 수행하고, 별도 CLI client가 session exchange로 `af_live_...` ingestion token을 받는지 검증합니다.
  - 발급 token으로 `/v1/ingest/status`가 성공하는지 검증합니다.
- `scripts/smoke-oauth-live.sh`
  - 실제 GitHub hosted login/consent 수동 smoke를 유지합니다.
- `scripts/check-action-pins.sh`
  - `AgentFeed-CLI`, `agentfeed-backend`, `agentfeed-frontend` workflow의 remote `uses:` ref를 모두 40-character commit SHA로 강제합니다.
  - local composite action(`./...`)은 예외로 둡니다.
- `scripts/test-all.sh`
  - OAuth contract/live smoke script syntax와 static contract를 확인합니다.
  - 기존 old-version grep 대신 positive SHA pin gate를 실행합니다.
- `Makefile`
  - `smoke-oauth-contract`, `smoke-oauth-live` target을 제공합니다.

### agentfeed-backend

- `.github/workflows/ci.yml`
  - `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6`
  - `actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405 # v6`

### agentfeed-frontend

- `.github/workflows/ci.yml`
  - `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6`
  - `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6`

## 검증 증거

> [!success]
> 2026-06-02 local verification 기준 cross-repo commercial-readiness gate가 통과했습니다.

- `agentfeed-dev ./scripts/smoke-oauth-contract.sh`
  - 결과: `OAUTH_CONTRACT_SMOKE_PASSED`
- `agentfeed-dev ./scripts/check-action-pins.sh`
  - 결과: `GitHub Actions uses refs are SHA-pinned.`
- `agentfeed-dev ./scripts/test-all.sh`
  - CLI: `296 passed (296)`, `npm run typecheck`, `npm run release:preflight`, `npm audit --omit=dev --audit-level=moderate` → `0 vulnerabilities`
  - Frontend: `npm run ci`, production build, `npm audit --omit=dev --audit-level=moderate` → `0 vulnerabilities`
  - Backend: `ruff check`, `275 passed`, Alembic offline migration chain captured `461` lines
  - Dev gates: OpenAPI contract gate, OAuth contract/live static gates, Actions SHA pin gate

## 남은 범위

> [!warning]
> 실제 hosted GitHub login/consent는 GitHub 사용자 브라우저 세션이 필요하므로 여전히 [[Commercial Readiness Hardening - Hosted OAuth Live Smoke Harness 2026-06-02]]의 `make smoke-oauth-live` 수동 smoke로 관리합니다.

자동화 완료:

- OAuth start redirect/state-cookie contract
- Mocked GitHub callback cookie/session contract
- Frontend CLI authorize approve contract
- CLI session exchange와 token validity contract
- Cross-repo workflow action SHA pinning contract

수동 유지:

- 실제 GitHub hosted login/consent 완료 후 `OAUTH_LIVE_SMOKE_PASSED` 확인

## 관련 링크

- [[Commercial Readiness Hardening - Hosted OAuth Live Smoke Harness 2026-06-02]]
- [[Commercial Readiness Hardening - Live Share Hydrated Smoke Revalidation 2026-06-02]]
- [[Integration - CLI Backend Frontend#남은 검증 리스크]]
- [[Auth & Credential Safety]]
- [[Active Tasks#P1 후보]]

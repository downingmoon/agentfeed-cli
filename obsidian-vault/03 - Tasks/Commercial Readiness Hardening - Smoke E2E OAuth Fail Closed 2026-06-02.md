---
title: Commercial Readiness Hardening - Smoke E2E OAuth Fail Closed 2026-06-02
aliases:
  - smoke-e2e OAuth fail closed
  - local E2E OAuth prerequisite gate
  - OAuth readiness false green prevention
tags:
  - agentfeed/commercial-readiness
  - agentfeed/integration
  - agentfeed/oauth
  - agentfeed/dev-gate
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Smoke E2E OAuth Fail Closed 2026-06-02

> [!success] 목표
> `make smoke-e2e`가 GitHub OAuth 설정 없이도 통과할 수 있는 false-green 경로를 제거하고, core browser-login readiness가 실제로 검증된 경우에만 green이 되도록 fail-closed 처리합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#계약 기준]]
- 관련 smoke: [[Commercial Readiness Hardening - Hosted OAuth Live Smoke Harness 2026-06-02]]
- credential-free contract 보완: [[Commercial Readiness Hardening - OAuth Contract Smoke and Action Pinning 2026-06-02]]

## 변경 범위

- `agentfeed-dev/scripts/smoke-e2e.sh`
  - `GITHUB_CLIENT_ID` / `GITHUB_REDIRECT_URI`가 없으면 Docker, browser, stack 검사 전에 즉시 실패.
  - 기존 `Skipping GitHub OAuth start redirect contract` 분기 제거.
  - OAuth start redirect contract는 strict smoke에서 항상 실행.
- `agentfeed-dev/scripts/test-all.sh`
  - fail-closed 메시지와 skip 분기 제거를 static gate로 고정.
- `agentfeed-dev/README.md`
  - `make smoke-e2e`는 strict fail-closed release-readiness smoke이며, credential-free 검증은 `make smoke-oauth-contract`로 분리한다고 명시.

## 고정된 계약

- `make smoke-e2e`는 local GitHub OAuth App 설정이 있는 환경에서만 full release-readiness green을 줄 수 있습니다.
- OAuth credential 없이 contract만 검증할 때는 `make smoke-oauth-contract`를 사용합니다.
- 설정 누락 시 실패 메시지는 remediation을 포함해야 합니다.

## 검증 증거

- RED: `scripts/test-all.sh`에 fail-closed marker gate를 추가한 직후 `grep` check가 실패했습니다.
- GREEN: OAuth env를 제거한 temp env로 `scripts/smoke-e2e.sh` 실행 시 즉시 실패하고 아래 메시지를 출력했습니다.
  - `GitHub OAuth App configuration is required for smoke-e2e`
- GREEN: `bash -n scripts/smoke-e2e.sh && bash -n scripts/test-all.sh`
- GREEN: `agentfeed-dev ./scripts/test-all.sh`
  - OpenAPI contract gate passed.
  - AgentFeed CLI: 314 tests passed, typecheck passed, release preflight passed, production dependency audit passed.
  - Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` passed, production dependency audit passed.
  - Backend: `ruff check .` passed, 283 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 이 변경은 false-green을 제거합니다. 실제 GitHub OAuth App credential 자체의 provider-side 동작은 기존 hosted/manual/live smoke 계층에서 계속 검증해야 합니다.

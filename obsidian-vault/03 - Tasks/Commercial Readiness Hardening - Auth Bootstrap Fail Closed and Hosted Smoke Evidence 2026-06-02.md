---
title: Commercial Readiness Hardening - Auth Bootstrap Fail Closed and Hosted Smoke Evidence 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/frontend
  - agentfeed/dev
  - commercial-readiness
  - hardening
  - smoke
status: done
aliases:
  - Auth bootstrap fail closed and hosted smoke evidence
---

# Commercial Readiness Hardening - Auth Bootstrap Fail Closed and Hosted Smoke Evidence 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Auth & Credential Safety]], [[Runtime Configuration]]

## 목표

Frontend auth bootstrap이 API 장애/비-401 오류에서도 이전 signed-in 상태를 남기지 않도록 보강하고, 운영 smoke 경로의 현재 증거를 분리한다.

> [!important] Acceptance
> - `auth.me`가 401이 아닌 오류로 실패해도 `signedIn=false`, `currentUser=null`, auth-bound social state clear가 적용된다.
> - OAuth callback/session exchange contract smoke가 local dev stack에서 통과한다.
> - Hosted compatibility smoke harness는 local override에서 통과한다.
> - 기본 hosted DNS smoke 실패는 코드 실패가 아니라 deployment/DNS blocker로 명시 기록한다.

## RED

- `npm run test:contracts`
  - 실패: `AppContext must centralize fail-closed signed-in state cleanup for all auth bootstrap failures`
  - 의미: 기존 `retryAuthCheck`는 비-401 `auth.me` 실패에서 `currentUser`만 지우고 이전 `signedIn=true` 및 social action eligibility를 남길 수 있었다.

## 변경

- `agentfeed-frontend/src/contexts/AppContext.tsx`
  - `clearSignedInSessionState()` 추가.
  - `apiConfigError`, malformed auth payload, 401 auth error, 비-401 auth bootstrap failure 모두 같은 fail-closed signed-in cleanup을 거치도록 정렬.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - AppContext가 모든 auth bootstrap 실패에서 signed-in state cleanup helper를 사용한다는 source contract 추가.

## Smoke / Evidence

- [x] `make smoke-oauth-contract`
  - 결과: `OAUTH_CONTRACT_SMOKE_PASSED`
  - 검증: mocked GitHub OAuth callback, CLI approval, CLI session exchange, exchanged ingestion token `/v1/ingest/status`.
- [x] `AGENTFEED_HOSTED_API_BASE_URL=http://localhost:8001/v1 AGENTFEED_HOSTED_API_ROOT_URL=http://localhost:8001 make smoke-hosted-compatibility`
  - 결과: `HOSTED_COMPATIBILITY_SMOKE_PASSED`
  - 검증: Backend metadata/readiness, CLI doctor compatibility, Frontend diagnostic compatibility helper.
- [ ] `make smoke-hosted-compatibility` with default hosted DNS
  - 현재 실패: `Hosted API host did not resolve: api.agentfeed.dev`
  - 분류: 외부 DNS/deployment blocker. 코드 harness는 local override로 통과했다.

> [!warning] Release blocker
> 상용화 완료를 주장하려면 `api.agentfeed.dev` DNS/deployment가 준비되고 default hosted compatibility smoke가 통과해야 한다.

## 병렬 감사 결과

- CLI: 최신 head에서 auth/credential/upload/release/privacy 확정 P1 없음.
- Backend: 최신 head에서 auth/session/privacy/ingest/production config 확정 P1 없음.
- Frontend: 확정 P1 없음. Lower-priority hardening 후보였던 auth bootstrap fail-closed 정렬을 이번 변경으로 처리.

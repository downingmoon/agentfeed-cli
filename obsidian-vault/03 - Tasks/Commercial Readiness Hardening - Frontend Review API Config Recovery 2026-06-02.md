---
title: Commercial Readiness Hardening - Frontend Review API Config Recovery 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/frontend
  - commercial-readiness
  - auth-recovery
  - api-config
status: done
aliases:
  - Frontend review API config recovery
---

# Commercial Readiness Hardening - Frontend Review API Config Recovery 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]], [[Auth & Credential Safety]]

## 목표

Worklog review page가 API config bootstrap 실패를 signed-out/loading 상태로 오해하지 않게 한다. Review/publish 화면은 공개 전 최종 검토 지점이므로, API 설정 오류가 있으면 GitHub login redirect나 publish controls 대신 explicit recovery UI로 fail-closed 해야 한다.

> [!important] Acceptance
> - `WorklogReviewPage`가 `apiConfigError`를 `useApp()`에서 소비한다.
> - `authError ?? apiConfigError`를 `authRecoveryError`로 합쳐 Dashboard/Notifications/Settings와 같은 패턴을 사용한다.
> - sign-in redirect와 review fetch가 `authRecoveryError` 동안 정지한다.
> - recovery branch가 active error를 표시하고 `retryAuthCheck`를 사용한다.
> - hard reload 없이 in-place retry를 유지한다.

## RED

- `npm run test:contracts`
  - 실패: `worklog review page must consume API config bootstrap failures`
  - 의미: 기존 review page는 `authError`만 보았고, `apiConfigError`는 loading/redirect branch를 막지 못했다.

## 변경

- `agentfeed-frontend/src/components/pages/WorklogReviewPage.tsx`
  - `apiConfigError`를 AppContext에서 읽음.
  - `const authRecoveryError = authError ?? apiConfigError` 추가.
  - redirect guard와 review data load guard를 `authRecoveryError` 기준으로 정렬.
  - recovery UI에서 `{authRecoveryError}`를 표시.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - review page가 Dashboard/Notifications/Settings와 같은 auth/API recovery branch를 갖도록 source contract 추가.

## Evidence

- [x] `npm run test:contracts`
  - RED 후 GREEN.
- [x] `npm run lint`
  - `tsc --noEmit` passed.
- [x] `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci`
  - typecheck, contracts, mock compatibility, production build passed.
- [x] `agentfeed-dev ./scripts/test-all.sh`
  - CLI 331 tests, Frontend CI/build/contracts/audit, Backend 292 tests, OpenAPI gate, Alembic offline chain 통과.

## 병렬 감사 반영

- Sidecar verifier가 Dashboard/Notifications/Settings의 existing `authRecoveryError` pattern과 AppContext bootstrap behavior를 확인했고, 이번 fix가 page-local 최소 변경이라고 판단했다.
- Over-fix 위험으로 AppContext 변경, hard reload 추가, review publish safety flow 변경은 피했다.

## 남은 후보

- Backend hosted deployment contract/runbook 보강.
- Frontend CI에서 hosted API compatibility를 어느 조건에서 manual/required gate로 둘지 정책화.

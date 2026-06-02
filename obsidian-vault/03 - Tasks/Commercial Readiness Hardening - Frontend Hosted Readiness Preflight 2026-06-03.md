---
title: Commercial Readiness Hardening - Frontend Hosted Readiness Preflight 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/ci
  - agentfeed/hosted
status: done
created: 2026-06-03
---

# Frontend Hosted Readiness Preflight

## 목표

Frontend push CI가 hosted API DNS 실패에서 즉시 멈추기 전에, canonical hosted Frontend root가 stale `/login` redirect 상태인지도 함께 드러내도록 fail-closed preflight를 추가했습니다.

## 변경

- `agentfeed-frontend/scripts/hosted-readiness-preflight.mjs` 추가
  - `NEXT_PUBLIC_API_URL` host DNS 확인
  - `AGENTFEED_HOSTED_FRONTEND_URL` 또는 `AGENTFEED_ROOT_SMOKE_URL`의 root 응답 확인
  - root가 `/login`으로 redirect되거나 landing marker가 없으면 실패
  - API DNS와 root failure를 한 번에 수집해 `HOSTED_READINESS_PREFLIGHT_FAILED`로 출력
- `agentfeed-frontend/scripts/run-ci.mjs`
  - hosted production API compatibility 전에 hosted readiness preflight 실행
  - `AGENTFEED_SKIP_PROD_API_COMPAT=1`인 deterministic local CI에서는 skip 유지
- `agentfeed-frontend/.github/workflows/ci.yml`
  - push CI 기본 hosted Frontend URL을 `https://agentfeed.dev/`로 고정
  - manual root smoke input이 hosted readiness URL도 override
- Contract tests 추가/갱신
  - `scripts/hosted-readiness-preflight.contract.test.mjs`
  - `scripts/run-ci.contract.test.mjs`
  - `scripts/ci-workflow.contract.test.mjs`
  - `src/lib/page-source-contract.test.ts`

## 검증

> [!success]
> Local deterministic path는 통과했고, hosted path는 현재 외부 blocker를 의도대로 동시에 보고합니다.

- `npm run test:contracts` — 통과
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` — 통과
- `../agentfeed-dev ./scripts/test-all.sh` — 통과
- `git diff --check` — 통과

## 현재 hosted blocker evidence

```text
HOSTED_READINESS_PREFLIGHT_FAILED
- API host did not resolve before hosted readiness check: api.agentfeed.dev ... ENOTFOUND api.agentfeed.dev
- Frontend root redirected to /login (307) for https://agentfeed.dev/
```

## 남은 외부 작업

- `api.agentfeed.dev` DNS/backend deployment 연결
- `https://agentfeed.dev/`가 최신 Frontend landing page를 serve하도록 deployment/domain mapping 복구
- 복구 후 `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_HOSTED_FRONTEND_URL=https://agentfeed.dev/ npm run check:hosted-readiness` 재실행

## 관련

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Windows DPAPI and Ingestion Quota 2026-06-03]]

---
title: Commercial Readiness Hardening - Frontend Review Origin Cross Validation 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/integration
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Frontend review origin cross validation
---

# Commercial Readiness Hardening - Frontend Review Origin Cross Validation 2026-06-04

## 목적

Backend `/v1/metadata.review_base_url`과 실제 hosted Frontend origin이 어긋나면 CLI review handoff, Frontend review navigation, hosted smoke가 서로 다른 배포면을 가리킬 수 있다. 이번 작업은 metadata shape만 확인하던 gate를 넘어서, **Backend canonical review origin이 배포 Frontend origin과 일치하는지** CI/hosted readiness에서 fail-closed 검증하도록 보강했다.

> [!important]
> 기준 방향은 DB/API canonical value를 Frontend가 따르는 것이다. 이번 변경은 Backend가 내려주는 `review_base_url`이 현재 배포 Frontend origin과 다르면 배포 검증에서 즉시 실패하게 만든다.

## 변경 요약

- `agentfeed-frontend/scripts/check-api-compatibility.mjs`
  - `AGENTFEED_HOSTED_FRONTEND_URL` 또는 `AGENTFEED_ROOT_SMOKE_URL`이 설정된 경우 metadata `review_base_url` origin을 hosted Frontend origin과 비교한다.
  - 일치 시 `FRONTEND_REVIEW_ORIGIN_MATCHED <origin>` evidence marker를 출력한다.
  - 불일치/unsafe URL은 public endpoint probe 전에 실패하여 stale review handoff를 조기에 차단한다.
- `agentfeed-frontend/scripts/mock-api-compatibility-check.mjs`
  - mock compatibility path도 hosted frontend URL을 주입한다.
  - `--review-origin-mismatch` 실패 모드를 추가해 metadata/frontend origin drift가 실제로 gate에서 잡히는지 검증한다.
- `agentfeed-frontend/scripts/hosted-readiness-preflight.mjs`
  - API DNS + Frontend root marker에 더해 `/v1/metadata`를 조회한다.
  - metadata `review_base_url`이 hosted Frontend origin과 다르면 `HOSTED_READINESS_PREFLIGHT_FAILED`로 실패한다.
- Contract tests
  - compatibility script source contract, mock compatibility contract, hosted readiness contract에 cross-origin mismatch 성공/실패 케이스를 추가했다.

## 검증

> [!success] Fresh local verification
> - `node scripts/hosted-readiness-preflight.contract.test.mjs` ✅
> - `node scripts/api-compatibility-mock.contract.test.mjs` ✅
> - `node scripts/check-api-compatibility.contract.test.mjs` ✅
> - `npm test` ✅
> - `npm run lint` ✅
> - `npm run check:api-compatibility:mock` ✅ (`FRONTEND_REVIEW_ORIGIN_MATCHED https://agentfeed.dev` 출력 확인)

## 남은 외부 차단 조건

- 코드/계약 게이트는 보강됐지만 실제 default commercial readiness는 여전히 hosted infra 준비가 필요하다.
- 현재 release blocker는 [[Active Tasks]]의 `https://agentfeed.dev/` stale `/login` redirect 및 `api.agentfeed.dev` DNS/deployment 준비 항목으로 유지한다.

## 관련 노트

- [[Commercial Readiness Hardening - Frontend Hosted Readiness Preflight 2026-06-03]]
- [[Commercial Readiness Hardening - Frontend Review Origin Navigation 2026-06-03]]
- [[Commercial Readiness Hardening - Metadata Review URL Trust 2026-06-03]]
- [[Commercial Readiness Hardening - Frontend Core API Compatibility Probes 2026-06-03]]
- [[Active Tasks]]
- [[AgentFeed CLI MOC]]

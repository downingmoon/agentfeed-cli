---
title: Commercial Readiness Hardening - Frontend Static Mock Data Removal 2026-06-01
aliases:
  - Frontend Static Mock Data Removal
  - Production Mock Data Removal
  - Frontend Demo Data Pruning
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Static Mock Data Removal 2026-06-01

## 목적

Frontend production 모듈에 더 이상 사용하지 않는 정적 mock 사용자/워크로그/프로젝트/리더보드/랜덤 heatmap 데이터가 남아 있지 않도록 제거했습니다.

> [!warning]
> 실제 API 기반 화면으로 전환된 뒤에도 mock dataset이 공유 util 모듈에 남아 있으면 번들/런타임에 데모 데이터가 섞일 수 있고, 이후 작업자가 mock fallback을 다시 연결하는 회귀가 생길 수 있습니다.

## 발견한 gap

- `agentfeed-frontend/src/lib/data.ts`는 현재 화면에서 `AGENTS` display metadata와 metric formatter만 사용합니다.
- 같은 파일에 unused `USERS`, `WORKLOGS`, `PROJECTS`, `LEADERBOARDS`, `HEATMAP` export가 남아 있었습니다.
- `HEATMAP`은 `Math.random()` 기반 top-level 생성이라, 모듈 import 시 데모 런타임 로직이 함께 평가될 수 있었습니다.

## Acceptance Criteria

- [x] Frontend shared data module에서 unused static mock users/worklogs/projects/leaderboards 제거.
- [x] Frontend shared data module에서 top-level random demo heatmap 제거.
- [x] 실제로 사용 중인 `AGENTS` display metadata와 formatting helper는 유지.
- [x] Source contract test가 mock dataset export 재도입을 막는다.
- [x] Frontend typecheck/contract/build 검증 통과.
- [x] Vault 문서는 [[Integration - CLI Backend Frontend]]와 [[Active Tasks]]에 연결한다.

## 구현 결과

- `agentfeed-frontend/src/lib/data.ts`
  - `USERS`, `WORKLOGS`, `PROJECTS`, `LEADERBOARDS`, `HEATMAP`, `SESSION_METRIC_DEFAULTS`, `generateHeatmap()` 제거.
  - `AGENTS`, `fmtMetricNumber`, `fmtSignedMetric`, `fmtMetricRatio`, `fmtTokens`, `fmtDuration`만 남겨 shared display utility로 축소.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `src/lib/data.ts`에 static mock dataset export와 `Math.random()`이 재도입되면 실패하는 source contract 추가.

## 검증 증거

- Targeted Frontend contract:
  - `npm run test:contracts` → passed.
- Frontend typecheck:
  - `npm run lint` → passed.
- Frontend production build:
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed.
- Cross-repo integration:
  - `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 281 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 256 pytest, Alembic offline migration chain.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend static mock data removal]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Landing API Backed Preview 2026-06-01]]
- [[Commercial Readiness Hardening - Worklog Author Mock Fallback Removal 2026-06-01]]

> [!success]
> Frontend shared module은 이제 실제 API-backed 화면에서 필요한 stable display metadata와 formatter만 보유하며, 대량 데모 데이터가 production path로 재진입하는 회귀를 source contract가 차단합니다.

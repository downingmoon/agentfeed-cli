---
title: Commercial Readiness Hardening - Frontend Manual Release Smoke Workflow Inputs 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/frontend
  - agentfeed/commercial-readiness
  - agentfeed/release
  - agentfeed/ci
status: done
aliases:
  - Frontend manual release smoke workflow inputs
  - Frontend CI root smoke workflow dispatch
---

# Commercial Readiness Hardening - Frontend Manual Release Smoke Workflow Inputs 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]]

## 목표

Frontend `npm run ci`는 `AGENTFEED_ROOT_SMOKE_URL`과 `AGENTFEED_VERIFY_PROD_API_COMPAT` opt-in을 이미 지원하지만, GitHub Actions manual dispatch에서 입력으로 연결되지 않으면 release operator가 preview/production target을 CI UI에서 바로 검증하기 어렵다.

> [!important] Acceptance
> - Frontend CI workflow가 `workflow_dispatch` inputs로 root smoke URL을 받는다.
> - Frontend CI workflow가 production API compatibility live check opt-in을 받는다.
> - Push/PR CI는 계속 DNS-independent default로 유지된다.
> - Source contract가 workflow input/export 경로를 검증한다.

## 변경 요약

- `agentfeed-frontend/.github/workflows/ci.yml`
  - `root_smoke_url` manual input 추가.
  - `verify_production_api_compatibility` manual boolean input 추가.
  - manual dispatch 때만 `AGENTFEED_ROOT_SMOKE_URL`, `AGENTFEED_VERIFY_PROD_API_COMPAT=1`을 export한 뒤 `npm run ci` 실행.
- `scripts/ci-workflow.contract.test.mjs`
  - workflow dispatch input과 env export 계약을 source-contract로 고정.
- `scripts/run-contract-tests.mjs`
  - 새 workflow contract를 Frontend contract suite에 포함.
- `README.md`
  - manual CI release/preview validation 입력 사용법 기록.

> [!note]
> 이 패치는 hosted DNS/deploy blocker 자체를 해결하지 않는다. 다만 blocker가 해결되거나 preview URL이 생겼을 때, 수동 release CI에서 root-login smoke와 live API compatibility를 명시적으로 실행할 수 있게 한다.

## 병렬 감사 결과

- CLI 감사: 추가 repo-local P1 없음. `publishDraft()` direct compatibility preflight는 P2 방어 중복 후보.
- Frontend 감사: 추가 repo-local P1 없음. workflow input 패치는 release-gate polish/hardening으로 현재 변경과 일치.
- Backend 감사: rate-limit store failure degraded-mode는 availability 후보이나, auth/ingest/write fail-closed 정책과 충돌할 수 있어 별도 좁은 정책 slice로 분리.

## 검증 증거

- `node scripts/ci-workflow.contract.test.mjs`
- `npm run test:contracts`
- `npm run lint`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_CONTRACT_API_URL=http://localhost:8000 npm run ci` → passed
- `../agentfeed-dev/scripts/test-all.sh` → passed
  - CLI 338 tests/typecheck/release preflight/audit passed
  - Frontend CI/build/mock compatibility/audit passed
  - Backend ruff, 300 tests, Alembic offline migration chain passed

## 남은 리스크 / 다음 후보

- External blocker: `https://agentfeed.dev/` still redirects to `/login`; `api.agentfeed.dev` still fails DNS resolution as of 2026-06-02 17:31 KST probe.
- Backend rate-limit degraded-mode는 다음 slice에서 “read-only low-risk만 fallback, auth/ingest/write는 fail-closed 유지”로 검토 가능.

## 관련 링크

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Upload Confirmation Startup Preflight and Explicit Root Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Frontend Mock API Compatibility CI Gate 2026-06-02]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]

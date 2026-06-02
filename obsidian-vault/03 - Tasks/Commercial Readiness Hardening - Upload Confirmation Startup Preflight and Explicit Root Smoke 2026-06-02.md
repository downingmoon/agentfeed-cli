---
title: Commercial Readiness Hardening - Upload Confirmation Startup Preflight and Explicit Root Smoke 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/integration
status: done
aliases:
  - Upload confirmation startup preflight explicit root smoke
  - CLI upload gate Backend startup preflight Frontend root smoke
---

# Commercial Readiness Hardening - Upload Confirmation Startup Preflight and Explicit Root Smoke 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]], [[Auth & Credential Safety]], [[Collection System]]

## 목표

상용화 readiness에서 false-green 또는 실수 업로드가 발생할 수 있는 남은 P1 gap을 줄인다.

> [!important] Acceptance
> - CLI human terminal `share`/`publish` upload는 `--yes` 없이는 private review draft를 서버로 전송하지 않는다.
> - JSON/CI automation은 기존 upload behavior를 유지한다.
> - Backend production/staging ASGI startup은 database 연결 및 Alembic head mismatch를 startup 단계에서 fail-fast 처리한다.
> - Frontend root-login smoke는 hosted default URL에 암묵적으로 의존하지 않고, explicit URL이 있을 때만 CI smoke stage를 실행한다.

## 병렬 감사 결과

- CLI 감사: credentials lifecycle, upload compatibility, collection state는 이미 보강되어 있었고, 남은 high-impact risk는 interactive `share/publish` accidental upload gate였다.
- Frontend 감사: CLI auth continuation/session persistence는 이미 안전했고, release-readiness gap은 root-login smoke가 hosted default에 암묵 의존하며 CI에 연결되지 않은 점이었다.
- Backend local inspection: `/health/ready`는 migration drift를 잡지만, production/staging startup 자체는 DB/migration drift를 fail-fast하지 않았다.

## 변경 요약

### CLI — interactive upload confirmation

- `agentfeed share` / `agentfeed publish` human terminal path에서 `--yes` 없이 upload 직전 중단.
- 중단 시 local draft id, project, title, privacy status와 재실행 명령을 출력.
- `agentfeed share --yes`, `agentfeed publish --id <draft> --yes`, `agentfeed publish --latest --yes`는 기존처럼 업로드.
- `--json` automation과 CI는 기존 non-interactive upload behavior 유지.
- `collect --upload`은 이미 upload intent가 명시적이므로 내부 `publish` 호출에 `--yes`를 전달.

> [!warning] CLI trust boundary
> `agentfeed share`는 이제 터미널에서는 preview-first command입니다. 실제 서버 전송은 `--yes`가 있는 명령으로만 진행됩니다. 자동화는 `--json`을 사용해야 합니다.

### Backend — production startup preflight

- `production_startup_preflight()` 추가.
- `ENVIRONMENT in {production, staging}`일 때만 실행.
- startup에서 DB connectivity, current migration revision, expected Alembic head를 검증.
- DB unavailable, revision/head unavailable, revision mismatch는 `RuntimeError`로 startup을 중단.
- development/test import 및 local TestClient flows는 startup DB requirement 없이 유지.

### Frontend — explicit root-login smoke

- `scripts/root-login-smoke.mjs`의 `https://agentfeed.dev` default fallback 제거.
- `AGENTFEED_ROOT_SMOKE_URL` 또는 explicit `AGENTFEED_FRONTEND_URL` 없이는 fail-closed.
- `scripts/run-ci.mjs`는 `AGENTFEED_ROOT_SMOKE_URL`이 있을 때만 `npm run smoke:root-login`을 build 이후 실행.
- ordinary CI는 DNS-independent, release CI는 explicit smoke target으로 opt-in.

## 검증 증거

> [!success] 통과한 gate
> 세 레포 targeted/full gate가 통과했습니다.

### CLI

- `npm run build`
- `npm run typecheck`
- `npm test -- tests/cli-share.test.ts` → 27 passed
- `npm test` → 22 files / 338 tests passed

### Backend

- `uv run --locked --group dev ruff check app/main.py tests/test_contracts.py` → passed
- `uv run --locked --group dev pytest tests/test_contracts.py -k 'startup_preflight or readiness'` → 7 passed
- `uv run --locked --group dev pytest` → 300 passed, 1 Starlette/httpx deprecation warning

### Frontend

- `node scripts/root-login-smoke.contract.test.mjs` → passed
- `node scripts/run-ci.contract.test.mjs` → passed
- `npm run lint` → passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_CONTRACT_API_URL=http://localhost:8000 npm run ci` → passed

> [!note] 의도된 fail-closed 확인
> `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 ... npm run ci`는 production build에서 localhost API URL을 거부했습니다. 이는 기존 production API explicitness guard가 정상 동작한 증거이며, 최종 CI 검증은 build URL을 `https://api.agentfeed.dev`로 명시해 통과했습니다.


### Dev 통합 gate

- `../agentfeed-dev/scripts/test-all.sh` → passed
  - Dev source contracts/OpenAPI gate passed
  - CLI 338 tests, typecheck, release preflight, npm audit passed
  - Frontend CI/build/mock compatibility/audit passed
  - Backend ruff, 300 tests, Alembic offline migration chain passed

## 변경 파일

- CLI
  - `src/cli/index.ts`
  - `src/cli/share.ts`
  - `tests/cli-share.test.ts`
  - `tests/share.test.ts`
  - `README.md`
- Backend
  - `app/main.py`
  - `tests/test_contracts.py`
- Frontend
  - `scripts/root-login-smoke.mjs`
  - `scripts/run-ci.mjs`
  - `scripts/root-login-smoke.contract.test.mjs`
  - `scripts/run-ci.contract.test.mjs`
  - `README.md`

## 남은 리스크 / 다음 후보

- Hosted blocker는 아직 별개입니다: `api.agentfeed.dev` DNS/deployment와 hosted root freshness가 준비되어야 `make commercial-readiness`가 default로 green이 됩니다.
- CLI `AGENTFEED_FORCE_UPLOAD_CONFIRMATION=1`은 regression-test override입니다. 사용자-facing 계약은 `--yes`, `--json`, CI/non-interactive behavior입니다.
- Backend startup preflight는 production/staging startup gate이며, readiness endpoint는 계속 runtime drift probe 역할을 유지합니다.

## 관련 링크

- [[Active Tasks]]
- [[Commercial Readiness Hardening - CLI Logout Atomic Writes OAuth Audit and Root Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Backend Production Deploy Contract 2026-06-02]]
- [[Commercial Readiness Hardening - Frontend Mock API Compatibility CI Gate 2026-06-02]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]

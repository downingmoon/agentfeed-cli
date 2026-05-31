---
title: Commercial Readiness Hardening - Compose Health Readiness 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/dev
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Compose health readiness hardening
---

# Commercial Readiness Hardening - Compose Health Readiness 2026-06-01

> [!success]
> `agentfeed-dev` Compose stack이 Postgres만 healthy로 보던 상태에서 Backend/Frontend까지 healthcheck와 readiness gate를 갖추게 됐습니다. `make up`은 detached stack을 띄운 뒤 세 서비스가 모두 healthy가 될 때까지 기다립니다.

## 결과

- `compose.yaml`에 `restart: unless-stopped`를 Postgres, Backend, Frontend에 추가했습니다.
- Backend healthcheck가 컨테이너 내부에서 `GET /health`를 확인합니다.
- Frontend healthcheck가 컨테이너 내부에서 Next dev server root route를 확인합니다.
- Frontend `depends_on`을 Backend `service_healthy` 조건으로 바꿔 API가 실제 ready 되기 전 시작을 줄였습니다.
- `make up`은 full stack을 detached로 시작한 뒤 `scripts/wait-ready.sh`를 실행합니다.
- `make wait`는 이미 실행 중인 stack의 동일 readiness contract를 기다립니다.
- `scripts/test-wait-ready.sh`가 Docker stub으로 healthy/missing/unhealthy 경로를 검증합니다.

## Product contract

> [!important]
> 로컬 3-repo 개발 환경은 “프로세스가 떠 있다”가 아니라 “Frontend/Backend/Postgres가 요청을 받을 수 있다”를 ready 조건으로 삼아야 합니다. readiness gate는 실패 시 현재 service health와 backend/frontend logs를 보여줘야 합니다.

## 변경 파일

- Dev: `compose.yaml`
- Dev: `Makefile`
- Dev: `scripts/wait-ready.sh`
- Dev: `scripts/test-wait-ready.sh`
- Dev: `scripts/test-all.sh`
- Dev: `README.md`

## 검증

- `bash -n scripts/wait-ready.sh` — passed
- `bash -n scripts/test-wait-ready.sh` — passed
- `./scripts/test-wait-ready.sh` — passed
- `docker compose --env-file .env.example config --quiet` — passed
- `agentfeed-dev make test` — passed
  - wait-ready contract tests passed
  - OpenAPI contract gate passed
  - CLI: 252 tests passed, typecheck, prepack, npm audit
  - Frontend: contract tests, npm audit, production build
  - Backend: ruff, 219 tests passed, Alembic offline migration chain
- Parallel code-review agent 지적사항: grep-only gate가 약함 → Docker stub 기반 `scripts/test-wait-ready.sh` 추가로 반영 완료.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Compose health readiness]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Feed Search Retry UX 2026-06-01]]

---
title: Commercial Readiness Hardening - Cross Repo CI Gates 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/ci
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Cross repo CI gates
---

# Cross repo CI gates

> [!success]
> CLI, Frontend, Backend가 각각 PR/push에서 실행할 최소 상용화 gate를 갖게 되었고, `agentfeed-dev make test`도 새 gate를 로컬 통합 검증에 포함합니다.

## 결과

### CLI

- `.github/workflows/ci.yml` 추가
  - `npm ci`
  - `npm test -- --run`
  - `npm run typecheck`
  - `npm run release:preflight`
  - `npm audit --omit=dev --audit-level=moderate`
- `release:preflight`가 built `agentfeed --help` smoke를 추가로 검증합니다.
- `tests/release-preflight.test.ts`가 smoke output contract를 고정합니다.

### Frontend

- `.github/workflows/ci.yml` 추가
  - Node 22 + `npm ci`
  - `npm run ci`
  - production dependency audit
- `scripts/run-ci.mjs` 추가
  - typecheck
  - local-contract API URL 기반 API contract tests
  - production API URL 기반 Next.js build
- `package.json`에 `test`, `ci` script 추가
- `.env.local.example`과 `README.md`를 추가해 `NEXT_PUBLIC_API_URL` 운영값과 local override caveat를 문서화했습니다.

### Backend

- `.github/workflows/ci.yml` 추가
  - Python 3.12 + locked uv sync
  - `ruff check .`
  - `pytest tests`
  - Alembic offline migration chain
- README Verification에 offline migration-chain gate를 추가했습니다.

### Dev orchestration

- `agentfeed-dev/scripts/test-all.sh`가 CLI `npm run release:preflight`와 Frontend `npm run ci`를 직접 호출하도록 정렬했습니다.

## 제품 계약

> [!important]
> 세 제품 레포의 PR/push CI와 로컬 `agentfeed-dev make test`가 같은 핵심 gate를 공유해야 합니다. 새 검증을 추가할 때는 개별 레포 CI와 `agentfeed-dev/scripts/test-all.sh`를 함께 갱신합니다.

> [!note]
> 이번 CI는 publish/deploy를 실행하지 않습니다. npm publish, production deploy, GitHub environment approval은 별도 명시적 release workflow에서 다뤄야 합니다.

## 검증

- CLI: `npm test -- --run tests/release-preflight.test.ts tests/version.test.ts` → 10 tests passed
- CLI: `npm run typecheck` → passed
- CLI: `npm run release:preflight` → passed, built `agentfeed --help` smoke included
- CLI: `npm audit --omit=dev --audit-level=moderate` → 0 vulnerabilities
- Frontend: `npm run ci` → typecheck, contract tests, production build passed
- Frontend: `npm audit --omit=dev --audit-level=moderate` → 0 vulnerabilities
- Backend: `uv run --locked --group dev ruff check .` → passed
- Backend: `uv run --locked --group dev pytest tests` → 219 passed
- Backend: `uv run --locked alembic upgrade head --sql` → 449-line offline migration SQL generated
- Dev: `make test` in `agentfeed-dev` → passed with new CLI/Frontend gates

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Cross repo CI gates]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - CLI Release Preflight and Provenance 2026-06-01]]

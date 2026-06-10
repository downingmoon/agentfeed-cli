---
title: Backend Production Runtime Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/production
  - enterprise-readiness
aliases:
  - 2026-06-10 production runtime split
---

# Backend Production Runtime Contract Split 2026-06-10

> [!success]
> Backend의 과밀한 `tests/test_contracts.py`에서 production deploy/runtime/startup preflight 계약 테스트 8개와 helper를 분리했고, CLI-Frontend-Backend 전체 게이트를 통과했다.

## Why

Enterprise 수준에서는 production 환경이 development 기본값으로 조용히 기동되거나, private API docs가 노출되거나, DB/migration readiness 없이 서비스가 시작되는 상황을 명확히 차단해야 한다. 이 계약들은 운영 런타임 안전성의 핵심이므로 일반 계약 모음에서 분리해 실패 지점과 소유권을 명확히 했다.

## Changed

Backend commit: `0ae89ef Split production runtime contracts`

- Added `agentfeed-backend/tests/test_production_runtime_contracts.py` (`185 LOC`)
- Added `agentfeed-backend/tests/test_production_startup_preflight_contracts.py` (`73 LOC`)
- Reduced `agentfeed-backend/tests/test_contracts.py` from `1808 LOC` to `1572 LOC`
- Moved these contracts without behavior changes:
  - deploy env example placeholder rejection
  - secure production deploy values
  - production app boot with private docs disabled
  - production start script/Procfile platform-port checks
  - production startup preflight skip/pass/fail DB/migration cases

## Verification Evidence

Backend targeted checks:

```text
uv run --locked --group dev pytest tests/test_production_runtime_contracts.py tests/test_production_startup_preflight_contracts.py
# 8 passed

uv run --locked --group dev pytest tests/test_contracts.py -k '<moved test names>'
# 69 deselected / 0 selected, exit 5 expected after move

uv run --locked --group dev ruff check tests/test_contracts.py tests/test_production_runtime_contracts.py tests/test_production_startup_preflight_contracts.py
# All checks passed

uv run --locked --group dev pytest
# 428 passed, 1 warning
```

Cross-repo contract/readiness gate:

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false
# Schema field contracts checked: 184 fields across 36 operations

bash scripts/test-all.sh
# CLI: 28 files / 591 tests passed, typecheck, release preflight, npm audit 0 vulnerabilities
# Frontend: typecheck, mock API compatibility, production build, npm audit 0 vulnerabilities
# Backend: ruff, 428 passed, alembic offline migration chain captured
```

## Follow-up

> [!todo]
> `tests/test_contracts.py`는 아직 `1572 LOC`로 크다. 다음 분리 후보는 아래 묶음이다.

- remaining production settings validator tests
- worklog create/project-id routing boundary tests
- audit event persistence/request-id tests
- GitHub OAuth upstream failure normalization tests

> [!note]
> 이번 패스는 신규 기능을 추가하지 않았고, 서버/인프라/CICD 변경 및 서버 배포도 하지 않았다.

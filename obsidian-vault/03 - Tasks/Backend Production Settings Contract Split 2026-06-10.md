---
title: Backend Production Settings Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/production
  - enterprise-readiness
aliases:
  - 2026-06-10 production settings split
---

# Backend Production Settings Contract Split 2026-06-10

> [!success]
> Backend의 과밀한 `tests/test_contracts.py`에서 production/server-test settings validator 계약 25개 케이스를 전용 파일로 분리했고, 배포 전 targeted gate를 통과했다.

## Why

Enterprise 수준에서는 운영 설정이 development 기본값, insecure URL/host, 누락된 OAuth secret, 잘못된 trusted proxy, 공개 docs 노출 등으로 조용히 완화되면 안 된다. 이번 패스는 production/server-test runtime settings validator 계약을 전용 파일로 분리해 보안/운영 설정 fail-closed surface의 소유권을 명확히 했다.

## Changed

Backend commit: `0d1a717 Split production settings contracts`

- Added `agentfeed-backend/tests/settings_contract_helpers.py`
- Added `agentfeed-backend/tests/test_environment_settings_contracts.py`
- Added `agentfeed-backend/tests/test_production_settings_fail_closed_contracts.py`
- Reduced `agentfeed-backend/tests/test_contracts.py` by moving production/server-test settings contracts out of the overloaded suite.
- Moved these contracts without behavior changes:
  - environment mode parsing and development/server-test/prod separation
  - moderator user and JWT runtime safety settings
  - production URL/host/TLS/local/private-DNS fail-closed validation
  - GitHub OAuth required settings
  - trusted proxy parsing
  - production API docs disabled contract

## Verification Evidence

Backend targeted checks:

```text
uv run --locked --group dev pytest tests/test_environment_settings_contracts.py tests/test_production_settings_fail_closed_contracts.py
# 25 passed

uv run --locked --group dev ruff check tests/test_contracts.py tests/settings_contract_helpers.py tests/test_environment_settings_contracts.py tests/test_production_settings_fail_closed_contracts.py
# All checks passed
```

## Deployment Note

> [!note]
> 이 문서 작성 직후 사용자의 명시 요청으로 개인서버 배포를 1회 진행한다. 이는 현재 feature/contract pass의 검증 가능한 소스 고정 이후 배포이며, 서버/인프라 설계 변경은 포함하지 않는다.

## Follow-up

> [!todo]
> `tests/test_contracts.py`는 아직 크다. 다음 분리 후보는 아래 묶음이다.

- audit event persistence/request-id tests
- GitHub OAuth upstream failure normalization tests
- worklog visibility/read boundary tests
- CI workflow/dependency consistency tests

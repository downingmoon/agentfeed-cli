---
title: Backend Worklog Public Source Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/privacy
  - enterprise-readiness
aliases:
  - 2026-06-10 worklog public source split
---

# Backend Worklog Public Source Contract Split 2026-06-10

> [!success]
> Backend의 과밀한 `tests/test_contracts.py`에서 worklog public source/privacy/agent-label 계약 테스트 7개를 전용 파일로 분리했고, CLI-Frontend-Backend 전체 게이트를 통과했다.

## Why

AgentFeed의 핵심은 로컬 agent 작업 데이터를 안전하게 수집하고 공개 가능한 형태로 보여주는 것이다. public source allowlist, privacy scan sanitization, CLI agent label 파생, ingest privacy scan bounds는 단순 내부 테스트가 아니라 공개 피드 품질과 개인정보 노출 방지의 핵심 계약이다. 기존 `tests/test_contracts.py` 안에 섞여 있으면 실패 원인과 소유권이 흐려지므로 전용 파일로 분리했다.

## Changed

Backend commit: `ed11f86 Split worklog public source contracts`

- Added `agentfeed-backend/tests/test_worklog_public_source_contracts.py` (`218 LOC`)
- Reduced `agentfeed-backend/tests/test_contracts.py` from `1978 LOC` to `1808 LOC`
- Moved these contract tests without behavior changes:
  - `test_public_worklog_source_allowlist_omits_local_identifiers`
  - `test_public_worklog_source_requires_agent_or_returns_none`
  - `test_public_worklog_source_drops_invalid_collection_quality`
  - `test_public_privacy_scan_defaults_invalid_status_to_safe`
  - `test_worklog_card_derives_agent_label_for_cli_agent_keys`
  - `test_ingest_privacy_scan_schema_matches_storage_and_contract_bounds`
  - `test_agent_label_derives_known_cli_agent_keys`

## Verification Evidence

Backend targeted checks:

```text
uv run --locked --group dev pytest tests/test_worklog_public_source_contracts.py
# 7 passed

uv run --locked --group dev pytest tests/test_contracts.py -k '<moved test names>'
# 77 deselected / 0 selected, exit 5 expected after move

uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_public_source_contracts.py
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
> `tests/test_contracts.py`는 아직 `1808 LOC`로 크다. 다음 분리 후보는 아래 묶음이다.

- production settings and startup preflight tests
- worklog create/project-id routing boundary tests
- audit event persistence/request-id tests
- GitHub OAuth upstream failure normalization tests

> [!note]
> 이번 패스는 신규 기능을 추가하지 않았고, 서버/인프라/CICD 변경 및 서버 배포도 하지 않았다.

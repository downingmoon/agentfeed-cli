---
title: Backend Ingestion CLI Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/cli
  - agentfeed/ingestion
status: done
---

# Backend Ingestion CLI Contract Split 2026-06-10

> [!success]
> CLI가 직접 의존하는 ingestion response/status와 integration setup guide 계약 테스트 4개를 `tests/test_contracts.py`에서 전용 파일로 분리했다. 기능 변경 없이 CLI-Backend 계약 소유권을 더 명확하게 만들었다.

## 목적

`agentfeed doctor`, `agentfeed collect/share`, integration setup guide는 CLI와 Backend 사이의 사용자-facing 계약이다. 기존에는 관련 테스트가 대형 `tests/test_contracts.py`에 흩어져 있어 CLI command drift 또는 response shape 회귀 원인을 빠르게 찾기 어려웠다. 이번 패스는 CLI ingestion 관련 계약을 작은 전용 파일로 분리했다.

## 변경 사항

- Backend 신규 테스트 파일:
  - `tests/test_ingestion_cli_contracts.py` — 145 lines
- `tests/test_contracts.py`에서 아래 테스트 이동:
  - `test_ingestion_response_models_reject_extra_fields`
  - `test_integration_setup_guides_only_advertise_shipped_cli_commands`
  - `test_ingest_response_marks_existing_worklog_reuse`
  - `test_ingestion_status_response_is_safe_for_cli_doctor`

## 보존한 계약

- Ingestion token/status/preview/ingest response schema는 secret/debug/raw field를 거부한다.
- Integration setup guide는 실제 CLI에 존재하는 command만 광고한다.
- `_ingest_response`는 기존 worklog 재사용 여부와 review URL/status/visibility 계약을 유지한다.
- `ingest_status`는 CLI doctor가 표시할 수 있는 safe user/token summary만 반환한다.

## 검증 증거

Pre-split 기준선:

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'ingestion_response_models_reject_extra_fields or integration_setup_guides_only_advertise_shipped_cli_commands or ingest_response_marks_existing_worklog_reuse or ingestion_status_response_is_safe_for_cli_doctor'
4 passed, 257 deselected in 0.56s
```

Focused split 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_ingestion_cli_contracts.py --fix
All checks passed!

uv run --locked --group dev pytest tests/test_ingestion_cli_contracts.py
4 passed in 0.59s
```

Backend 전체 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_ingestion_cli_contracts.py
All checks passed!

uv run --locked --group dev pytest
428 passed, 1 warning in 3.85s
```

Cross-repo 검증:

```text
node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh
AgentFeed OpenAPI contract gate passed.
CLI: 28 files / 591 tests passed, typecheck/release preflight/audit passed
Frontend: typecheck, contract tests, mock API compatibility, production build, audit passed
Backend: ruff passed, 428 passed, Alembic offline migration chain passed
```

## 후속 과제

> [!todo]
> 다음 후보는 `CORS/CSRF/request payload boundary`와 `rate limit identity` 잔여 테스트다. 이미 `tests/test_request_boundary_contracts.py`와 `tests/test_rate_limit_boundary_contracts.py`가 있으므로 중복 없이 옮길 수 있는 묶음을 먼저 확인한다.

> [!info]
> 이번 패스에서는 신규 기능 추가와 서버 배포를 하지 않았다.

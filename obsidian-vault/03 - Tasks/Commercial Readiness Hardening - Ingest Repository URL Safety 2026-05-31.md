---
title: Commercial Readiness Hardening - Ingest Repository URL Safety 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/integration
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Ingest Repository URL Safety 2026-05-31

## 목적

Backend에는 public URL validator가 있고 일반 project create/update는 이를 사용하지만, ingestion payload의 `project.repository_url`은 별도 schema로 들어와 같은 검증을 받지 않았습니다. 공식 CLI는 URL userinfo를 제거하지만, 상용 API는 direct caller도 같은 trust boundary를 통과해야 합니다.

> [!important]
> API는 공식 CLI의 client-side sanitization에 의존하면 안 됩니다. Backend ingestion schema가 private/local/credential-bearing URL을 직접 거부해야 합니다.

## 변경 사항

- `agentfeed-backend/app/schemas/ingestion.py`
  - `IngestProject.repository_url`에 `validate_public_http_url()` field validator를 추가했습니다.
  - blank repository URL은 `None`으로 normalize됩니다.
  - `http`/`https` public host만 허용하고 userinfo, localhost, private IP, `.local` host를 거부합니다.
- `agentfeed-backend/tests/test_contracts.py`
  - ingestion payload가 credential-bearing/private repository URL을 거부하는지 테스트합니다.
  - public GitHub URL trimming/normalization과 blank-to-None을 검증합니다.

## 검증 증거

- RED: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k public_url_schemas` → 기존 구현에서 ingestion unsafe URL이 validation error를 내지 않아 실패
- GREEN:
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k public_url_schemas` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'public_url_schemas or ingest'` → passed (28 tests)
  - `uv run --python 3.12 --locked --group dev ruff check app/schemas/ingestion.py tests/test_contracts.py` → passed
  - `uv run --python 3.12 --locked --group dev pytest -q` → passed (200 tests, 기존 Starlette deprecation warning 1건)
  - `make test` in `agentfeed-dev` → passed (CLI, Frontend, Backend, Alembic offline migration gate)

## 남은 리스크

> [!warning]
> 이미 저장된 legacy unsafe `projects.repository_url` 값은 이 schema 변경만으로 backfill되지 않습니다. 운영 DB에 오래된 값이 의심되면 별도 data audit/backfill script가 필요합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Ingest repository URL safety]]
- [[Active Tasks#P1 후보]]

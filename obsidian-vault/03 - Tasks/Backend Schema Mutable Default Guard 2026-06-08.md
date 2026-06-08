---
title: Backend Schema Mutable Default Guard 2026-06-08
aliases:
  - Backend schema default guard
  - Pydantic mutable default guard
status: completed
date: 2026-06-08
tags:
  - agentfeed/backend
  - agentfeed/contract
  - agentfeed/enterprise-hardening
  - project/tasks
---

# Backend Schema Mutable Default Guard 2026-06-08

## 결론

Backend response schema에서 계약 drift를 만들 수 있는 mutable literal defaults를 제거하고, `app/schemas` 전체에 재발 방지 regression을 추가했다.

> [!success] 완료
> `ExploreProject.tags`, `Worklog.tags`, `IngestPreviewResponse.warnings`가 모두 `Field(default_factory=list)`를 사용한다. `app/schemas/*.py`에 typed field literal `[]`/`{}` default가 다시 생기면 contract test가 실패한다.

## 변경 내용

- `app/schemas/explore.py`
  - `ExploreProject.tags: list[str] = Field(default_factory=list)`
- `app/schemas/worklog.py`
  - `Worklog.tags: list[WorklogTag] = Field(default_factory=list)`
- `app/schemas/ingestion.py`
  - `IngestPreviewResponse.warnings: list[str] = Field(default_factory=list)`
- `tests/test_contracts.py`
  - `test_schema_models_do_not_use_mutable_literal_defaults` 추가.
  - `app/schemas`의 typed field가 literal `[]` 또는 `{}` default를 쓰지 못하도록 source-level guard 추가.

## 왜 필요한가

Pydantic이 실제 런타임에서 일부 mutable default를 복사하더라도, Enterprise 품질 기준에서는 shared response contract에 literal mutable default가 남아 있으면 다음 문제가 생긴다.

- schema drift를 코드 리뷰에서 놓치기 쉽다.
- frontend/CLI가 strict normalizer를 갖고 있어도 backend schema 자체가 느슨해 보인다.
- 신규 schema 작성자가 같은 패턴을 복제할 수 있다.

이번 guard는 [[Backend Ok Response Contract Guard 2026-06-08]]에서 시작한 공통 schema hardening을 `app/schemas` 전체로 확장한 것이다.

## 검증

> [!success] Fresh verification evidence
> - Backend targeted: `uv run pytest tests/test_contracts.py::test_schema_models_do_not_use_mutable_literal_defaults tests/test_contracts.py::test_common_success_and_error_response_payloads_are_strict && uv run ruff check app/schemas/explore.py app/schemas/worklog.py app/schemas/ingestion.py tests/test_contracts.py` → 통과.
> - Backend full: `uv run pytest && uv run ruff check .` → `402 passed`, ruff 통과.
> - Frontend: `npm run test:contracts && npm run lint` → 통과.
> - CLI: `npm run release:preflight` → `562 passed`, release preflight 통과.

## 후행 과제

- 신규 response schema에서 빈 list/dict 기본값이 필요하면 항상 `Field(default_factory=...)`를 사용한다.
- 서버/인프라/CICD/배포는 현재 goal 규칙상 보류한다.

## 관련 문서

- [[Backend Ok Response Contract Guard 2026-06-08]]
- [[Frontend UI API Boundary Guard 2026-06-08]]
- [[Active Tasks]]

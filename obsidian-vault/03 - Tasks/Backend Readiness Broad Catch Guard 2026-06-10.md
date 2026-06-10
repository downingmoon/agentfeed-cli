---
title: Backend Readiness Broad Catch Guard 2026-06-10
aliases:
  - Backend Readiness Broad Catch Guard
status: done
tags:
  - agentfeed/backend
  - agentfeed/contract
  - agentfeed/observability
  - agentfeed/verification
updated: 2026-06-10
---

# Backend Readiness Broad Catch Guard 2026-06-10

> [!success] 결론
> Backend `/health/ready` route에서 `except Exception` 기반 catch-all masking을 제거했다. 예상 가능한 DB/migration unavailable 상태는 database helper의 `False`/`None` sentinel로 `not_ready`를 반환하고, 예상 밖 programming/runtime bug는 표준 500 error envelope로 드러난다.

## 변경 범위

- Backend `app/system_routes.py`
  - readiness route의 broad `except Exception` 3개 제거.
  - database connectivity, migration revision, migration head 결과를 명시적인 sentinel 값으로 해석.
- Backend `app/database.py`
  - migration head lookup에서 예상 가능한 `CommandError`, `OSError`만 catch하고 `None` 반환.
  - arbitrary `RuntimeError`/programming error는 readiness route에서 숨기지 않는다.
- Backend `tests/test_system_contracts.py`
  - expected infrastructure unavailable case는 `False`/`None` sentinel로 고정.
  - unexpected database probe bug가 `not_ready`로 masking되지 않고 500 error envelope가 되는 회귀 테스트 추가.
  - `app/system_routes.py`에 broad `except Exception`/`except BaseException`이 재도입되지 않도록 source contract 추가.

## Contract rule

```text
/health/ready may convert expected database or migration unavailability to not_ready.
/health/ready must not catch every Exception and hide programming errors as not_ready.
```

> [!warning] 유지 규칙
> readiness endpoint는 운영자가 배포 상태를 판단하는 표면이다. DB down/stale migration은 503 `not_ready`여야 하지만, code bug는 500으로 관측되어야 한다.

## Verification evidence

- Red 확인:
  - `uv run pytest tests/test_system_contracts.py::test_readiness_route_does_not_mask_programming_errors_with_broad_exception_handler` → broad `except Exception` 때문에 실패.
- Backend targeted:
  - `uv run pytest tests/test_system_contracts.py -q` → `9 passed, 1 warning`.
  - `uv run pytest tests/test_system_contracts.py tests/test_error_contracts.py tests/test_production_startup_preflight_contracts.py -q` → `19 passed, 1 warning`.
- Backend full:
  - `uv run pytest -q` → `430 passed, 1 warning`.
  - `uv run ruff check .` → pass.
- Manual HTTP surface smoke:
  - `uv run python` + `TestClient(app, raise_server_exceptions=False)`:
    - `/health` → `200 application/json`.
    - `/v1/metadata` → `200 application/json`.
- Static scan:
  - `rg "except Exception|except BaseException" app/system_routes.py app/database.py` → no matches.
- LOC check:
  - `app/system_routes.py` → 59 logical lines.
  - `app/database.py` → 55 logical lines.
  - `tests/test_system_contracts.py` → 172 logical lines.
- Not tested:
  - LSP diagnostics: local `basedpyright-langserver` is not installed.

## Follow-up

> [!todo]
> Backend still has intentional top-level `except Exception` boundaries in request middleware and production startup preflight. Keep those explicit as boundary handlers; do not add broad catches to route-level business/readiness logic.

## Related

- [[CLI API JSON Boundary Guard 2026-06-10]]
- [[Frontend API JSON Boundary Guard 2026-06-10]]

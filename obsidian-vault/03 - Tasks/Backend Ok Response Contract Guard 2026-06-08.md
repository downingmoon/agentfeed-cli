---
title: Backend Ok Response Contract Guard 2026-06-08
aliases:
  - Backend ok response guard
  - OkResponse strict payload guard
status: completed
date: 2026-06-08
tags:
  - agentfeed/backend
  - agentfeed/contract
  - agentfeed/enterprise-hardening
  - project/tasks
---

# Backend Ok Response Contract Guard 2026-06-08

## 결론

Backend 공통 성공 응답 `OkResponse`를 frontend `normalizeOkResponse`가 기대하는 정확한 계약인 `{ data: { ok: true } }`로 잠갔다.

> [!success] 완료
> `OkResponse`가 더 이상 임의 `dict` 또는 mutable default에 의존하지 않는다. `ok: false`, `ok: "true"`, `{ data: {} }`는 schema validation에서 실패한다.

## 변경 내용

- `app/schemas/common.py`
  - `OkPayload` 추가.
  - `OkResponse.data`를 `OkPayload`로 타입화.
  - `Field(default_factory=lambda: OkPayload(ok=True))`로 기본 성공 payload를 안전하게 생성.
  - `ErrorDetail.details`도 mutable `{}` default 대신 `Field(default_factory=dict)`로 변경.
- `tests/test_contracts.py`
  - `OkResponse` strict payload regression 추가.
  - `ErrorDetail.details`가 인스턴스 간 공유되지 않는지 regression 추가.

## 왜 필요한가

Frontend는 `projects.delete`, `report`, `revoke token`, `read-all` 같은 성공 mutation에서 `ok === true`가 아니면 `ok response contract mismatch`로 fail-closed한다.
Backend schema가 `dict = {"ok": True}`처럼 열려 있으면 다음 drift를 schema 차원에서 막지 못한다.

- `ok: false`가 성공 응답처럼 문서화/노출될 위험
- `{ data: {} }`가 기본값 보정으로 통과할 위험
- mutable default가 장기적으로 공통 schema에 남는 유지보수 위험

## 검증

> [!success] Fresh verification evidence
> - Backend: `uv run pytest && uv run ruff check .` → `401 passed`, ruff 통과.
> - Frontend: `npm run test:contracts && npm run lint` → 통과.
> - CLI: `npm run release:preflight` → `562 passed`, release preflight 통과.

## 후행 과제

- 신규 성공 payload가 `ok` 외 데이터를 필요로 하면 `OkResponse`를 확장하지 말고 별도 `DataResponse[...]` schema를 정의한다.
- 서버/인프라/CICD 변경은 현재 goal 규칙상 보류한다.

## 관련 문서

- [[Frontend UI API Boundary Guard 2026-06-08]]
- [[Remaining Mutation Response Guard 2026-06-08]]
- [[Active Tasks]]

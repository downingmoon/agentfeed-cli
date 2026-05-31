---
title: Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01
aliases:
  - Project Nullable Field Clear Semantics
  - Project Edit Null Clear
status: done
date: 2026-06-01
tags:
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
---

# Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01

## 결과

> [!success]
> Project edit에서 `description`, `repository_url`, `homepage_url`을 빈 값으로 지우는 흐름이 Backend `PATCH /v1/projects/{project_id}`의 explicit `null` clear 계약과 Frontend form serializer까지 연결되었습니다.

## 변경 요약

- Backend `UpdateProjectRequest`가 omitted field와 explicit `null`을 구분하는 Pydantic `model_fields_set` 계약을 회귀 테스트로 고정했습니다.
- Backend project update가 `exclude_unset=True`로 PATCH body를 읽고, nullable text fields에 한해 explicit `null`을 저장하도록 바꿨습니다.
- `name`, `visibility`, `tags` 같은 non-nullable project fields는 explicit `null`이 들어와도 기존 값을 덮어쓰지 않도록 fail-closed 처리했습니다.
- `description`은 create/update 모두 blank string을 `None`으로 normalize합니다.
- Frontend create serializer는 blank optional fields를 계속 omit합니다.
- Frontend update serializer는 blank `description`, `repositoryUrl`, `homepageUrl`을 explicit `null`로 보냅니다.
- Project detail edit 화면의 임시 “Backend project updates cannot clear” 차단 guard를 제거했습니다.

## 계약 기준

> [!important]
> 이 수정은 [[Integration - CLI Backend Frontend#계약 기준|Database column name → Backend → Frontend → CLI]] 순서를 따릅니다. DB/Backend nullable field 이름은 `description`, `repository_url`, `homepage_url`이고, Frontend form은 update 시 이 필드들을 `null`로 clear합니다.

> [!warning]
> create와 update는 blank-field semantics가 다릅니다. create는 빈 optional field를 omit하고, update는 기존 값을 지우기 위해 explicit `null`을 보냅니다. 두 serializer를 합치면 clear/no-op 구분이 깨집니다.

## 검증

- `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k "update_project or public_url"` in `agentfeed-backend` → passed (`5 passed`)
- `uv run --python 3.12 --locked --group dev ruff check app/routers/projects.py app/schemas/project.py tests/test_contracts.py` in `agentfeed-backend` → passed
- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → passed (`client contracts: 66`, backend-only: `2`)
- `make test` in `agentfeed-dev` → passed


## 후속 smoke 승격

> [!success]
> [[Commercial Readiness Hardening - Project Clear Smoke Gate 2026-06-01]]에서 이 계약을 `agentfeed-dev make smoke-e2e`의 API + hydrated DOM gate로 승격했습니다.

## 관련 링크

- [[Commercial Readiness Hardening - Project Clear Smoke Gate 2026-06-01]]
- [[Integration - CLI Backend Frontend#2026-06-01 Project nullable field clear semantics]]
- [[Commercial Readiness Hardening - Project Mutation Surface 2026-06-01]]
- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]

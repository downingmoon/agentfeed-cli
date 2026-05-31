---
title: Cross Repo OpenAPI Contract Gate
aliases:
  - CLI Frontend Backend Contract Gate
  - OpenAPI Client Contract Gate
created: 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/integration
  - agentfeed/api
status: done
---

# Cross Repo OpenAPI Contract Gate

## 목표

3개 레포가 따로 움직이더라도 CLI/Frontend가 호출하는 Backend API path와 method가 OpenAPI에서 사라지거나 JSON 응답 계약 없이 바뀌는 일을 `make test` 단계에서 차단합니다.

> [!important]
> 계약 기준은 Backend OpenAPI입니다. Frontend/CLI의 URL parameter 이름은 실제 wire path에는 영향을 주지 않지만, gate matrix에는 Backend OpenAPI parameter 이름을 사용합니다.

## 구현 요약

- `agentfeed-dev/scripts/check-openapi-contract.mjs`를 추가했습니다.
- 이 스크립트는 sibling `agentfeed-backend`의 FastAPI app을 import해 현재 OpenAPI schema를 export합니다.
- CLI runtime endpoint 6개와 Frontend runtime endpoint 56개를 `{method, path}` 단위로 검증합니다.
- client가 JSON을 parse하는 endpoint는 OpenAPI의 success response에 `application/json` content가 있어야 합니다.
- client가 아직 소비하지 않는 Backend endpoint는 `backend-only` allowlist가 아니라 **명시적 분류 목록**에 reason과 함께 들어가야 합니다.
- `agentfeed-dev/scripts/test-all.sh`에 syntax check와 실행 check를 넣어 `make test`에 자동 포함했습니다.
- `agentfeed-dev/README.md`에 cross-repo contract gate 운영 방식을 기록했습니다.

## 현재 Backend-only 분류

> [!todo]
> 아래 항목은 더 이상 “숨은 불일치”가 아니고, 의도/제품 gap으로 명시 분류된 상태입니다. 상용화 완성도를 더 올릴 때 Frontend surface 연결 여부를 판단해야 합니다.

- `GET /v1/auth/github/callback` — OAuth provider callback
- `POST /v1/ingest/token/rotate` — deprecated compatibility endpoint
- `POST /v1/projects` — project create UI 미연결
- `PATCH /v1/projects/{project_id}` — project edit UI 미연결
- `DELETE /v1/projects/{project_id}` — project delete UI 미연결
- `GET /v1/users/{username}/activity` — public activity tab 미연결

## 검증 증거

- `node --check scripts/check-openapi-contract.mjs` in `agentfeed-dev` → pass
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → pass
  - OpenAPI operations checked: 68
  - Client contracts checked: 62 (`cli: 6`, `frontend: 56`)
  - Classified backend-only operations: 6
- `env NEXT_PUBLIC_API_URL=http://localhost:8000 npm run test:contracts` in `agentfeed-frontend` → pass
- `make test` in `agentfeed-dev` → pass
  - CLI: `251 passed`
  - Frontend: contract/type/audit/build passed
  - Backend: ruff passed, `214 passed, 1 warning`, Alembic offline migration chain captured

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Cross-repo OpenAPI contract gate]]
- [[Commercial Readiness Hardening - Full JSON API Response Contract 2026-05-31]]
- [[Commercial Readiness Hardening - Profile Username Settings Surface 2026-05-31]]
- [[Commercial Readiness Hardening - Report Actions Surface 2026-06-01]]
- [[Active Tasks#P1 후보]]

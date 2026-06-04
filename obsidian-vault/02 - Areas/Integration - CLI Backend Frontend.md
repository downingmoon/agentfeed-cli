---
title: Integration - CLI Backend Frontend
aliases:
  - AgentFeed 3 Repo Integration
  - Cross Repo Integration
status: active
tags:
  - agentfeed/integration
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
updated: 2026-06-04
---

# Integration - CLI Backend Frontend

## End-to-end flow

1. CLI가 local project/session/git/test evidence를 수집한다.
2. CLI가 local draft와 privacy scan 결과를 만든다.
3. 사용자가 upload intent를 명시한다.
4. CLI가 Backend `/v1/metadata`, token status, ingest compatibility를 preflight한다.
5. Backend `/v1/ingest/worklogs`가 private review worklog를 생성하거나 duplicate를 idempotent하게 재사용한다.
6. CLI가 trusted review URL만 browser/clipboard handoff한다.
7. Frontend `/worklogs/[id]/review`에서 사용자가 privacy finding을 검토하고 publish한다.
8. public worklog가 `/feed`, `/profile`, `/projects`, `/explore`, `/search`에 노출된다.

## 주요 API 계약

- `GET /v1/metadata`: API/review origin/contract version compatibility.
- `POST /v1/auth/cli/start`, approve, status, exchange: browser login.
- `GET /v1/ingest/status`: token/API preflight.
- `POST /v1/ingest/worklogs`: CLI upload.
- `GET /v1/worklogs/{id}/review`: private review.
- `POST /v1/worklogs/{id}/publish`: public publish.
- `GET /v1/feed`, `/v1/search`, `/v1/tags`, `/v1/explore`, `/v1/projects`: public discovery.
- `/v1/me/*`: dashboard/settings/tokens/bookmarks.

## Field naming policy

DB column name을 기준으로 Backend schema와 Frontend adapter를 맞춘다.

예: DB/Backend가 `name`이면 Frontend도 `name`을 canonical로 사용하고, `tag` 같은 UI-local 별칭은 adapter 내부에서만 제한적으로 쓴다.

## 현재 CI/readiness 구조

| Gate | 위치 | 성격 |
| --- | --- | --- |
| CLI CI | `agentfeed-cli` | build/test/typecheck/preflight/audit/windows smoke |
| Backend CI | `agentfeed-backend` | ruff/pytest/API contract |
| Frontend Code CI | `agentfeed-frontend` | lint/contracts/mock compatibility/local build |
| Hosted readiness | `agentfeed-frontend` manual | 실제 hosted API/Frontend URL 필요 |
| Cross-repo test | `agentfeed-dev make test` | sibling repos contract |
| Commercial readiness | `agentfeed-dev make commercial-readiness` | local + hosted + browser + OAuth evidence |

## 현재 정정 사항

> [!warning]
> `agentfeed.dev`는 아직 실제 production domain이 아니다. Hosted readiness는 `AGENTFEED_HOSTED_API_BASE_URL`, `AGENTFEED_HOSTED_FRONTEND_URL`을 명시해야 한다.

관련: [[Runtime Configuration]], [[Commercial Readiness Completed Summary 2026-06-04]]

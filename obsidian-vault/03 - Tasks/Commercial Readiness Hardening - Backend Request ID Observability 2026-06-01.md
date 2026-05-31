---
title: Backend Request ID Observability
date: 2026-06-01
tags:
  - agentfeed/backend
  - agentfeed/observability
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Backend Request ID Observability

> [!success]
> Backend 모든 HTTP 응답 경로에 `X-Request-ID` correlation header와 query-secret-safe structured request log를 추가했습니다.

## 배경

상용 운영에서는 사용자가 보고한 오류, CLI 재시도, rate-limit 판단, reverse proxy log를 하나의 요청 단위로 연결할 수 있어야 합니다. 기존 Backend는 payload cap, CSRF, rate-limit, readiness는 갖췄지만 요청 correlation ID가 없어 운영 이슈 추적이 어려웠습니다.

## 변경 계약

- API는 safe `X-Request-ID` 요청 header를 받으면 그대로 echo합니다.
- header가 없거나 unsafe 형식이면 서버가 opaque ID를 생성합니다.
- 모든 정상/handled/internal-error 응답에 `X-Request-ID`를 포함합니다.
- request log는 structured extra field를 사용합니다.
  - `request_id`
  - `method`
  - `path` — query string 제외
  - `status_code`
  - `duration_ms`
- unexpected error는 raw exception을 client에 노출하지 않고 `INTERNAL_SERVER_ERROR` JSON envelope와 `request_id`만 반환합니다.

> [!warning]
> request log에는 URL query string을 남기지 않습니다. OAuth code, token, search query 등 사용자/인증 정보가 query에 섞일 수 있기 때문입니다.

## 수정 파일

- Backend
  - `app/main.py`
  - `tests/test_contracts.py`
  - `README.md`

## 검증 증거

- `uv run --locked --group dev ruff check app/main.py tests/test_contracts.py` → passed
- `uv run --locked --group dev pytest tests/test_contracts.py -k "request_id or trusted_host or readiness" -q` → `7 passed, 205 deselected, 1 warning`
- `uv run --locked --group dev ruff check .` → passed
- `uv run --locked --group dev pytest tests` → `226 passed, 1 warning`

## 후속 후보

Parallel gap scan에서 남은 상용화 후보:

- Frontend: rising builders follow button duplicate in-flight mutation lock
- Frontend: landing hero preview like/bookmark의 local-only interaction illusion 제거 또는 명시적 preview UX화
- CLI: publish-time provenance dry-run gate / credential storage fallback policy / timeout-after-success idempotency 확인

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Backend request ID observability]]
- [[Active Tasks#P1 후보]]

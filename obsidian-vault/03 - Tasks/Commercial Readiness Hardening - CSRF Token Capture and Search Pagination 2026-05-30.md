---
title: Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30
aliases:
  - CSRF Token Capture Search Pagination Hardening
  - 2026-05-30 CSRF and Search Pagination
created: 2026-05-30
tags:
  - agentfeed/readiness
  - agentfeed/auth
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30

> [!important] 목표
> [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]] 이후 남은 상용화 P1 gap 중 cookie-auth mutation CSRF 방어, one-time token capture UX, search cursor contract, invalid-token CLI recovery 안내를 한 루프로 닫았습니다.

## 배경

병렬 readiness audit에서 다음 문제가 확인되었습니다.

- Frontend는 모든 API call에 `credentials: include`를 사용하지만 Backend mutation path에는 명시적인 cookie-origin gate가 없었습니다.
- Settings token rotation은 raw secret을 한 번 보여주지만 copy/reveal/recovery UX가 약해 실사용자가 놓치기 쉬웠습니다.
- Backend `/v1/search`는 `cursor` parameter를 받지만 무시하고 항상 `has_more=false`를 반환했습니다.
- CLI upload 401/`INGESTION_TOKEN_INVALID` 안내가 token rotation 도입 후에도 `agentfeed login` 중심이라 env token 사용자를 잘못 안내할 수 있었습니다.

## 변경 범위

- [[Auth & Credential Safety#2026-05-30 Cookie-authenticated mutation Origin gate|Cookie-authenticated mutation Origin gate]]
- [[Auth & Credential Safety#2026-05-30 One-time rotated token capture UX|One-time rotated token capture UX]]
- [[Runtime Configuration#2026-05-30 CLI invalid token recovery hint|CLI invalid token recovery hint]]
- [[Integration - CLI Backend Frontend#2026-05-30 Search cursor pagination contract|Search cursor pagination contract]]
- [[Integration - CLI Backend Frontend#2026-05-30 Settings token capture UX contract|Settings token capture UX contract]]

## 구현 요약

### Backend

- `app/main.py`에 cookie-authenticated unsafe method Origin/Referer gate를 추가했습니다.
- `access_token` cookie가 있는 `POST/PATCH/PUT/DELETE` 계열 요청은 `FRONTEND_URL` / `ALLOWED_ORIGINS` 중 하나에서 온 경우만 통과합니다.
- Bearer-only CLI ingestion request와 safe method는 Origin 요구에서 제외합니다.
- `/v1/search`는 stable ordering, offset cursor decode/encode, `has_more`, `next_cursor`를 실제로 반환합니다.
- Search branch는 `limit + 1` fetch로 다음 페이지 존재 여부를 계산합니다.

### Frontend

- `/settings` rotated token panel을 copy-first UX로 바꿨습니다.
- Raw secret은 기본 masked 상태이며, clipboard 실패 시 reveal fallback을 안내합니다.
- Panel은 120초 후 자동 clear되고, 사용자가 dismiss하기 전에는 다른 token mutation을 막아 “one-time secret을 놓치는” 사고를 줄입니다.
- `/search`는 Backend pagination envelope을 받아 `Load more results`로 다음 cursor를 요청하고 결과를 merge합니다.

### CLI

- Upload/preview/publish 401 또는 `INGESTION_TOKEN_INVALID` friendly error를 `agentfeed rotate` 중심으로 조정했습니다.
- `AGENTFEED_TOKEN` source는 CLI가 in-place update할 수 없으므로 env 교체 또는 `agentfeed rotate --browser`를 안내합니다.

## 계약

> [!warning] Cookie-auth boundary
> CSRF gate는 cookie-authenticated browser mutation만 제한합니다. CLI bearer ingestion은 cookie가 없으므로 Origin header 없이 계속 동작해야 합니다.

> [!warning] One-time secret boundary
> Rotation raw token은 response 한 번에만 존재합니다. Frontend는 secret을 localStorage/sessionStorage/API cache에 저장하지 않고 panel state에서만 다룹니다.

> [!note] Search pagination
> Search cursor는 offset cursor입니다. `type=all`에서는 각 branch가 같은 offset을 적용해 다음 batch를 가져오고, typed search에서는 해당 branch만 이어 받습니다.

## 검증 결과

> [!success] 통과한 gate
> CLI/Backend/Frontend targeted gate와 dev 통합 smoke가 모두 통과했습니다.

- CLI:
  - `npm run typecheck && npm test -- --run` → 166 passed
  - targeted `tests/api-hook.test.ts tests/cli-status-doctor.test.ts` → 34 passed
- Backend:
  - `uv run --python 3.12 --locked --group dev ruff check app/main.py app/routers/search.py tests/test_contracts.py`
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q` → 116 passed
  - `agentfeed-dev/scripts/test-all.sh` backend suite → 129 passed
- Frontend:
  - `npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- Integration:
  - `../agentfeed-dev/scripts/test-all.sh` → passed
  - `../agentfeed-dev/scripts/smoke-e2e.sh` → passed

Live smoke 결과:

```text
E2E smoke passed
Verified CLI publish → review API → frontend route → publish → feed for 04152b93-c956-42e5-989c-5213d88b4595
```

## 남은 리스크

- Search는 offset cursor라 대량 데이터/동시 업데이트 환경에서 keyset만큼 강하지 않습니다. 공개 검색 품질이 커지면 rank/keyset cursor로 고도화할 수 있습니다.
- Cookie Origin/Referer gate는 modern browser 기준 방어입니다. 향후 third-party embed나 alternate frontend domain을 추가하면 `ALLOWED_ORIGINS` 운영 절차가 필요합니다.
- Settings rotated token copy UX는 automated build/type gate로 검증했지만 clipboard permission denial은 브라우저별 수동 QA 가치가 있습니다.

## 관련 링크

- [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks#새로 발견한 P1 후보 / 다음 루프]]

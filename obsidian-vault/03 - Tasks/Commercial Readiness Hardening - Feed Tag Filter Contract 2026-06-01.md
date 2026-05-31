---
title: Commercial Readiness Hardening - Feed Tag Filter Contract 2026-06-01
aliases:
  - Feed Tag Filter Contract
  - Explore Tag to Feed Contract
status: done
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
---

# Commercial Readiness Hardening - Feed Tag Filter Contract 2026-06-01

## 결과

> [!success]
> Explore의 popular tag 링크(`/feed?tag=...`)가 Feed 화면과 Backend `/v1/feed?tag=...` 계약까지 실제로 이어지도록 복구했습니다.

## 변경 요약

- Feed URL sync가 `tag` query parameter를 보존합니다.
- Feed page가 `searchParams.get('tag')`를 hydrate해 `useFeed()`의 Backend request params에 포함합니다.
- active tag chip과 clear control을 추가해 사용자가 tag filter 상태를 이해하고 해제할 수 있게 했습니다.
- Feed header의 hard-coded `최근 24시간 ↑ 36` metric을 제거하고 현재 loaded count/context를 표시합니다.
- Frontend contract tests가 tag serialization, tag URL hydration, Explore tag link, hard-coded metric 제거를 고정합니다.

## 계약 기준

> [!important]
> Backend는 이미 `GET /v1/feed`에서 `tag` filter를 지원합니다. Frontend는 Explore에서 생성한 `/feed?tag=` URL을 잃어버리면 안 되고, URL sync 과정에서도 `tag`를 제거하면 안 됩니다.

> [!note]
> tag 값은 URL에서 trim하고 leading `#`를 제거한 뒤 80자로 제한합니다. React 렌더링과 `URLSearchParams` 인코딩을 통해 표시/전송하므로 raw HTML로 삽입하지 않습니다.

## 검증

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` in `agentfeed-frontend` → passed
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → passed (`client contracts: 66`, backend-only: `2`)
- `make test` in `agentfeed-dev` → passed (CLI 252 tests/prepack/audit, Frontend contracts/build/audit, Backend 219 tests + Alembic offline chain)

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Feed tag filter contract]]
- [[Active Tasks#P1 후보]]

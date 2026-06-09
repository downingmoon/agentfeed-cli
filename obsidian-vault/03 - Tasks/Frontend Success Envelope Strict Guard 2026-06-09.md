---
title: Frontend Success Envelope Strict Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - api-contract
  - data-response
  - list-response
  - fail-closed
status: done
related:
  - "[[Frontend OkResponse Strict Payload Guard 2026-06-09]]"
  - "[[Frontend Ingestion Token Mutation Strict Response Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend Success Envelope Strict Guard 2026-06-09

## 결론

Frontend `apiFetch`의 성공 응답 root envelope를 Backend `common.py`의 strict response wrapper와 맞췄다. 이제 성공 JSON이 `data`를 포함하는 경우, root에서 허용되지 않은 field가 있으면 공통적으로 `502` contract mismatch로 거부한다. 또한 pagination은 실제 paginated route에서만 허용된다.

> [!important] Goal constraint
> Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 근거

Backend 기준 계약은 `agentfeed-backend/app/schemas/common.py`다.

- `DataResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 root field: `data`
- `ListResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 root field: `data`, `pagination`
- `OkResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 root field: `data`

기존 Frontend는 각 `r.data` normalizer에서 nested payload를 주로 검증했고, `apiFetch` 자체는 성공 JSON root를 generic cast했다. 따라서 `{ data: ..., debug: true }` 또는 non-list route의 `{ data: ..., pagination: ... }` 같은 envelope drift가 조용히 통과할 수 있었다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `paginationEnvelopeAllowed(path)` 추가.
  - `validateSuccessEnvelope(value, path)` 추가.
  - `parseApiJson()`이 JSON parse 직후 성공 envelope root field를 검증하도록 변경.
  - paginated route만 root `pagination`을 허용하도록 제한.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - DataResponse root extra field rejection 추가.
  - non-list DataResponse의 root `pagination` rejection 추가.
  - ListResponse root extra field rejection 추가.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint
```

결과:

- Frontend contract tests 통과
- TypeScript `tsc --noEmit` 통과

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- AgentFeed OpenAPI contract gate passed
- `75` operations checked
- `70` client contracts checked
- `40` response field contracts checked

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build
```

결과:

- Next.js production build 통과
- `18` static pages generated

## 후행 과제

- `paginationEnvelopeAllowed(path)`의 route allowlist가 Backend paginated routes와 계속 일치하도록 Dev OpenAPI gate에서 자동 검증할 수 있는지 검토한다.
- Backend `SearchResponse`와 `LeaderboardListResponse`는 `DataResponse/ListResponse` generic은 아니지만 root `data + pagination` 구조를 공유하므로, 별도 schema extra policy와 Frontend allowlist를 함께 추적한다.
- CLI API client도 success envelope root extra field를 공통으로 거부하는지 점검한다.

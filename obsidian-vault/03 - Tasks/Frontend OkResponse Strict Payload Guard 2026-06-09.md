---
title: Frontend OkResponse Strict Payload Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - api-contract
  - ok-response
  - fail-closed
status: done
related:
  - "[[Frontend Ingestion Token Mutation Strict Response Guard 2026-06-09]]"
  - "[[Auth Social Explore Ingestion Strict Response Boundary 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend OkResponse Strict Payload Guard 2026-06-09

## 결론

Frontend의 공통 `OkResponse` normalizer가 Backend `OkPayload` 계약과 동일하게 `ok` 외 extra field를 거부하도록 보강했다. 이 변경은 logout, worklog delete, project delete, ingestion token revoke, notification read-all, report actions처럼 `OkResponse`를 공유하는 성공 응답 경계 전체에 적용된다.

> [!important] Goal constraint
> Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 근거

Backend 기준 계약은 `agentfeed-backend/app/schemas/common.py`다.

- `OkPayload`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `ok`
  - `ok: Literal[True]`
- `OkResponse`
  - `model_config = ConfigDict(extra="forbid")`
  - 허용 필드: `data`

기존 Frontend `normalizeOkResponse()`는 `value.ok === true`만 검증하고 `{ ok: true, debug: true }` 같은 payload를 허용했다. Backend는 이미 `OkPayload` extra field를 금지하므로 Frontend도 같은 경계에서 fail-closed 해야 한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeOkResponse()`에 `rejectUnexpectedKeysForContract(value, ['ok'], ...)` 적용.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - allowlisted empty success response(`204`, empty body)는 기존처럼 허용되는지 유지 검증.
  - `auth.logout`, `worklogs.delete`, `projects.delete`, `me.revokeIngestionToken`, `me.markAllNotificationsRead`, `social.reportWorklog`, `social.reportComment`가 `{ data: { ok: true, debug: true } }`를 contract mismatch로 거부하는 회귀 테스트 추가.

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

- Frontend `apiFetch`의 `DataResponse` root envelope 자체가 Backend `DataResponse(extra="forbid")`와 같은 수준으로 extra field를 거부하는지 별도 점검한다.
- `ListResponse` root/pagination envelope는 이미 여러 normalizer에서 검증 중이지만, 공통화 가능한지 검토한다.
- CLI 쪽 error/ok response parsing도 Backend `common.py`의 strict response model과 같은 정책인지 확인한다.

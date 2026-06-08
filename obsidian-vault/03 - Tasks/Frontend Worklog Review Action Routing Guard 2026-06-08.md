---
title: Frontend Worklog Review Action Routing Guard 2026-06-08
aliases:
  - Worklog Review action response routing guard
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/worklog-review
updated: 2026-06-08
---

# Frontend Worklog Review Action Routing Guard 2026-06-08

## 결론

Worklog Review의 privacy finding resolve, publish, unpublish action은 안전/공개 상태를 바꾸는 mutation이므로 Frontend page-local raw fetch로 API boundary를 우회하면 안 된다. 현재 API client와 Backend response model은 이미 strict하지만, page source contract에 이 routing invariant가 없어서 회귀 방지 guard를 추가했다.

## 변경

- `src/lib/page-source-contract.test.ts`
  - `WorklogReviewPage`가 아래 typed API client action을 사용해야 함을 고정.
    - `worklogs.resolveFinding(worklogId, findingId, 'redacted')`
    - `worklogs.publish(worklogId, visibility)`
    - `worklogs.unpublish(worklogId, 'private')`
  - `WorklogReviewPage`에서 `fetch(` 또는 `apiFetch` 직접 사용을 금지.

## 현재 계약 근거

> [!success]
> Frontend `src/lib/api.ts`는 action response를 `normalizeResolvePrivacyFindingResponse`, `normalizePublishWorklogResponse`, `normalizeUnpublishWorklogResponse`로 검증한다. malformed response는 `AgentFeed worklog action response contract mismatch` 502 `ApiError`로 fail-closed 된다.

> [!success]
> Backend `app/schemas/worklog.py`는 `ResolvePrivacyFindingResponse`, `PublishWorklogResponse`, `UnpublishWorklogResponse` response model을 제공하고, `app/routers/worklogs.py`의 route도 해당 `DataResponse[...]`를 사용한다.

## 검증

- Frontend: `npm run test:contracts && npm run lint` 통과.
- Backend: `uv run pytest && uv run ruff check .` 통과 (`400 passed`, ruff 통과).
- CLI: `npm run release:preflight` 통과 (`27 test files`, `562 passed`).

## 후행 과제

- [ ] 다음 contract hardening slice에서 review 외 owner-only mutation pages도 page-local raw fetch 우회가 없는지 같은 방식으로 점검한다.

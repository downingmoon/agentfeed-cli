---
title: Frontend Worklog Detail Array Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
aliases:
  - Worklog detail array contract guard
---

# Frontend Worklog Detail Array Contract Guard 2026-06-08

## 결론

Frontend API boundary의 worklog detail normalizer가 `outcome`/`timeline`이 `null` 또는 누락된 경우 빈 배열 `[]`로 합성할 수 있었다. Backend `WorklogResponse` contract는 두 필드를 list로 제공하고, worklog detail 화면은 multi-agent 작업 evidence를 이 배열들에 의존한다. 따라서 성공 응답에서 필드가 없거나 `null`이면 조용히 정상처럼 렌더링하지 않고 contract mismatch로 실패해야 한다.

> [!success] 수정 완료
> `src/lib/api.ts`의 `normalizeOutcomeItemsForContract()` / `normalizeTimelineItemsForContract()`가 `null`/`undefined`를 빈 배열로 바꾸지 않고, 배열이 아니면 `worklog detail response contract mismatch`로 fail-closed 처리하도록 변경했다.

## 수정 범위

- `agentfeed-frontend/src/lib/api.ts`
  - `outcome` missing/null → `[]` fallback 제거.
  - `timeline` missing/null → `[]` fallback 제거.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - API boundary에서 outcome missing/null, timeline missing/null을 502 contract mismatch로 거부하는 regression 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `if (value === null || value === undefined) return [];` 회귀 방지 guard 추가.

## 검증 evidence

- Frontend
  - `npm run test:contracts && npm run lint`
  - 결과: 통과.
- Backend
  - `uv run pytest && uv run ruff check .`
  - 결과: 400 tests passed, 1 warning, ruff 통과.
- CLI
  - `npm run release:preflight`
  - 결과: 27 test files, 562 tests passed, release preflight passed.

## 후행 과제

- Worklog detail 계열에서 API-authorized empty array와 malformed/missing field를 구분하는 source guard를 유지한다.
- 다음 audit slice에서는 Frontend `WorklogReviewPage`의 `privacy_findings` row guard처럼 page-local helper가 API contract mismatch를 배열 drop으로 숨기는 곳이 더 남아있는지 점검한다.

## 관련 노트

- [[Frontend Worklog Detail Adapter Fail Closed 2026-06-08]]
- [[Worklog Detail Response Guard 2026-06-08]]
- [[Frontend Worklog Review Payload Guard 2026-06-08]]
- [[Active Tasks]]

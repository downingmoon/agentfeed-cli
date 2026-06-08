---
title: Frontend UI API Boundary Guard 2026-06-08
aliases:
  - UI API boundary source guard
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/enterprise-readiness
updated: 2026-06-08
---

# Frontend UI API Boundary Guard 2026-06-08

## 결론

Frontend production UI surface가 backend I/O를 직접 `fetch`하거나 private `apiFetch` helper를 호출하지 않고, `src/lib/api.ts`의 typed API client를 통해서만 통신하도록 source contract를 보강했다. 이로써 owner-only/account/project/settings mutation page가 page-local raw fetch를 추가해 response normalizer와 visible error handling을 우회하는 회귀를 막는다.

## 변경

- `src/lib/page-source-contract.test.ts`
  - `src/app`, `src/components`, `src/contexts`, `src/hooks` 아래 TypeScript/React source를 재귀적으로 스캔한다.
  - 각 production UI 파일에 대해 아래를 금지한다.
    - `fetch(` 직접 호출
    - `apiFetch` 직접 import/call
  - Backend I/O는 `src/lib/api.ts`에서만 수행하도록 API boundary invariant를 고정한다.

## 점검 결과

> [!success]
> 현재 source 기준 production UI surface의 backend I/O는 이미 `src/lib/api.ts`로 집중되어 있었다. 이번 작업은 발견된 우회를 고친 것이 아니라, 이후 owner/account mutation 화면에서 raw fetch가 재도입되지 않도록 회귀 방지 장치를 추가한 것이다.

> [!note]
> CLI 자체 API client(`AgentFeed-CLI/src/api/client.ts`)와 Backend GitHub OAuth `httpx` 호출은 각각 자체 API boundary에 해당하므로 이번 Frontend UI source guard 범위에 포함하지 않았다.

## 검증

- Frontend: `npm run test:contracts && npm run lint` 통과.
- Backend: `uv run pytest && uv run ruff check .` 통과 (`400 passed`, ruff 통과).
- CLI: `npm run release:preflight` 통과 (`27 test files`, `562 passed`).

## 후행 과제

- [ ] 다음 slice에서 `src/lib/api.ts` 내부의 mutation response normalizer coverage를 account/settings/project/social 순서로 재점검한다.

---
title: Project Read Detail Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/contracts
  - frontend
  - enterprise-hardening
status: done
---

# Project Read Detail Contract 2026-06-11

> [!summary]
> Frontend project list/detail/mutation parsing now follows the backend project response envelope more strictly. The work keeps the public `src/lib/adapters.ts` import surface intact while moving user/project adapter responsibilities into focused modules.

## 변경 내용

- `ProjectStats.agents_used`를 Frontend API contract에 반영했다.
- Project stats는 backend canonical fields와 기존 public/legacy aliases만 허용하고, 알 수 없는 stats field는 502 contract mismatch로 실패한다.
- Project list/read/mutation payload는 예상하지 않은 project/root/wrapper field를 거부한다.
- Owner-aware project detail wrapper `{ project, stats }`는 `project`, `stats` 외의 field를 거부한다.
- Project adapter는 `stats.agents_used`를 domain `Project.agents`로 전달한다.
- 비대해진 `adapters.ts`에서 user/project adapter 책임을 `user-adapters.ts`, `project-adapters.ts`, `adapter-primitives.ts`로 분리했다.

## 검증

- Frontend: `npm run lint && npm test` 통과.
- Backend: `uv run pytest tests/test_project_surface_contracts.py tests/test_project_stats_contracts.py tests/test_project_public_stats_contracts.py tests/test_route_response_model_contracts.py` 통과, 16 passed.
- LSP diagnostics: local `typescript-language-server` 미설치로 실행 불가. 대신 `tsc --noEmit`이 통과했다.

## 후행 과제

> [!todo]
> `src/lib/adapters.ts`는 이번 분리로 781 LOC에서 크게 줄었지만 아직 worklog adapter 책임 때문에 250 LOC 이상이다. 다음 cleanup slice에서 worklog metrics/source/detail adapter까지 책임 단위로 분리하는 것이 좋다.

## 관련 문서

- [[Frontend API Contract Hardening]]
- [[Enterprise Readiness Review]]

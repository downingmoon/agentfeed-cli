---
title: Explore Strict Field Guards 2026-06-11
tags:
  - agentfeed
  - contracts
  - frontend
  - verification
status: done
created: 2026-06-11
---

# Explore Strict Field Guards 2026-06-11

## 목적

Backend `ExploreSection` 계열 응답 모델은 `extra="forbid"` 기준으로 동작한다. Frontend Explore parser도 동일하게 동작해야 하므로, `/explore` 응답의 불필요한 필드가 조용히 통과하지 않도록 fail-closed guard를 추가했다.

## 변경 사항

- Frontend `src/lib/api-explore.ts`
  - `ExploreSection` top-level 허용 필드 고정.
  - `trending_projects` 항목 허용 필드 고정.
  - `popular_prompts` 항목 허용 필드 고정.
  - `featured_categories` 항목 허용 필드 고정.
  - `rising_builders`는 기존 `normalizePublicUserForContract(..., ['recent_worklog_count'])` 경로가 이미 extra field를 거부하므로 유지.
- Frontend `src/lib/explore-strict-fields.contract.test.ts`
  - 기존 거대 `api-contract.test.ts`를 더 키우지 않기 위해 별도 소형 테스트로 추가.
  - top-level `debug`, project `private_repo`, prompt `raw_prompt`, category `debug` extra field를 각각 502 contract mismatch로 거부하는지 확인.
- Frontend `scripts/run-contract-tests.mjs`
  - 신규 contract test를 compile/run 목록에 추가.

## Backend 기준

- `app/schemas/explore.py`
  - `ExploreSection(extra="forbid")`
  - `ExploreProject(extra="forbid")`
  - `PopularPrompt(extra="forbid")`
  - `FeaturedCategory(extra="forbid")`
- `RisingBuilder`는 `PublicUser` 기반이며 `recent_worklog_count` 외 extra field를 거부한다.

## 검증

- Frontend
  - `npm run test:contracts` 통과.
  - `npm run lint && npm test` 통과.
- Backend
  - `uv run pytest tests/test_public_schema_response_model_contracts.py tests/test_route_response_model_contracts.py tests/test_dashboard_count_response_model_contracts.py` 통과: 10 passed.
- CLI
  - `npm test -- tests/api-client-json-boundary.test.ts` 통과: 1 passed.
- Hygiene
  - `src/lib/api-explore.ts`: 123 pure LOC.
  - `src/lib/explore-strict-fields.contract.test.ts`: 139 pure LOC.
  - `scripts/run-contract-tests.mjs`: 128 pure LOC.
  - diff 내 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, 신규 `any`, empty catch 없음.

> [!warning] LSP 제한
> 로컬에 `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run lint`로 타입 검증했다.

## 후행 과제

- 기존 `src/lib/api-contract.test.ts`는 5000 LOC 이상으로 지나치게 크다. 신규 contract guard는 계속 소형 파일로 추가하고, 별도 리팩터링 슬라이스에서 기능군별 분리를 진행한다.
- Explore 외 남은 discovery/search 보조 API가 있다면 Backend `extra="forbid"` 모델과 Frontend parser allowlist를 같은 방식으로 대조한다.

## 관련 노트

- [[Project Response Required Field Guard 2026-06-11]]
- [[Project Schema Variant Guards 2026-06-11]]
- [[Project Stats Strict Field Guard 2026-06-11]]

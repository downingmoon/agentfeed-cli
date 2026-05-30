---
title: Commercial Readiness Hardening - Feed Keyset and OAuth Hash Redirect 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: done
created: 2026-05-31
related:
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Commercial Readiness Hardening - Feed Keyset and OAuth Hash Redirect 2026-05-31

> [!success] 결과
> Backend aggregate feed pagination의 offset drift와 Frontend OAuth sign-in redirect의 hash 손실을 동시에 닫은 상용화 hardening pass입니다.

## 변경 요약

- Backend
  - `/v1/feed`와 `/v1/feed/following`의 `most_liked`, `most_discussed`, `trending` sort에서 offset cursor fallback을 제거했습니다.
  - Aggregate cursor는 `score`, `published_at`, `id`를 담고, query는 `score DESC, published_at DESC, id DESC` keyset predicate를 사용합니다.
  - `latest` / `most_shipped`도 `published_at DESC, id DESC` tie-breaker를 사용해 기존 id cursor predicate와 정렬을 맞췄습니다.
- Frontend
  - GitHub OAuth `next` redirect가 safe hash fragment를 보존합니다. 예: `/search?q=codex#results`.
  - `javascript:`, `//evil`, control char, OAuth token/code/state leakage가 있는 hash는 strip합니다.
  - Header sign-in button은 click 시점의 `window.location.hash`를 반영합니다.
  - Docs page의 잘못된 `agentfeed share --upload --open-review` 안내를 실제 명령인 `agentfeed share --open-review`로 수정했습니다.

## 검증 증거

> [!success] 실행 완료
> 변경 레포 targeted/full 검증과 dev 통합 gate까지 통과했습니다.

- Backend targeted: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app/routers/feed.py tests/test_contracts.py && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q tests/test_contracts.py -k 'feed_aggregate_sort_cursor or keyset_list_endpoints_ignore_malformed_cursors'` → 3 passed
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 177 passed, 1 known Starlette deprecation warning
- Frontend targeted: `npm run test:contracts && npx tsc --noEmit` → passed
- Frontend full: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Cross-repo integration: `make test` in `agentfeed-dev` → passed, including CLI 230 tests, CLI prepack/audit, frontend build, backend 177 tests, Alembic offline migration chain
- Diff hygiene: `git diff --check` in Backend/Frontend → passed

## 남은 리스크

> [!warning]
> Aggregate score 자체가 요청 사이에 바뀌는 경우 완전한 snapshot pagination은 별도 cursor snapshot/token 설계가 필요합니다. 이번 변경은 offset drift와 tie-breaker 불안정을 제거하는 실용적 keyset hardening입니다.

- 실제 브라우저 OAuth 왕복에서 hash 위치 복원은 GitHub credential이 있는 staging/live 환경에서 별도 수동 smoke가 필요합니다.
- Feed aggregate keyset은 SQL contract와 unit-level fake DB로 검증했고, 대량 데이터/동시 social action 부하 검증은 아직 별도입니다.

## 연결

- [[Auth & Credential Safety#2026-05-31 OAuth next hash preservation]]
- [[Integration - CLI Backend Frontend#2026-05-31 Aggregate feed keyset and OAuth hash redirect]]
- [[Active Tasks#P1 후보]]

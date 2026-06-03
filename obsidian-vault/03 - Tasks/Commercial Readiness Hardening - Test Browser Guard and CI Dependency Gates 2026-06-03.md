---
title: Commercial Readiness Hardening - Test Browser Guard and CI Dependency Gates 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - ci
status: done
aliases:
  - Test Browser Guard and CI Dependency Gates
---

# Commercial Readiness Hardening - Test Browser Guard and CI Dependency Gates 2026-06-03

관련: [[Active Tasks]], [[Integration - CLI Backend Frontend]], [[Commercial Readiness Hardening - Review Path Proxy and Clipboard Fail Closed 2026-06-03]]

## 배경

테스트 반복 중 `http://localhost:3001/worklogs/worklog_publish_confirmed/review` 브라우저 탭이 실제로 열리는 현상이 관찰됐다. 해당 URL은 `tests/cli-share.test.ts`의 fixture review URL이며, CLI가 업로드 성공 후 review URL을 handoff하는 경로를 검증하기 위해 사용한다.

> [!bug] 원인
> CLI 기본 프로젝트 설정은 `collection.open_review_after_upload: true`이고, `agentfeed publish`/`share --yes` 성공 후 `openBrowser(review_url)`을 호출할 수 있다. Vitest가 CLI를 자식 프로세스로 실행할 때 fake browser opener가 명시되지 않은 경로에서는 실제 macOS `open`까지 도달할 수 있었다.

## 변경

- CLI
  - `openBrowser()`가 `AGENTFEED_TEST_DISABLE_REAL_BROWSER=1`, `NODE_ENV=test`, `VITEST=true`, `VITEST_WORKER_ID` 환경에서는 fake opener가 명시된 경우만 브라우저를 열도록 보강.
  - Vitest child-process 환경에서 실제 browser opener가 실행되지 않는 regression 추가.
- Frontend
  - `AGENTFEED_SKIP_PROD_API_COMPAT=1`과 `AGENTFEED_HOSTED_FRONTEND_URL` 조합을 fail-fast 처리.
  - hosted readiness는 production API path를 증명해야 하므로 local DNS-less skip으로 우회하지 못하게 contract test 추가.
- Backend
  - GitHub Actions CI에 `uv pip check` dependency consistency gate 추가.
  - dependency check가 `uv sync --locked --group dev` 이후, lint/test 이전에 실행되는 source contract 추가.

## 검증

- CLI: `npm run build && npm run typecheck && npm test -- --run`
  - 23 files / 376 tests passed
- Frontend: `npm run test:contracts`
- Frontend: `npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- Backend: `uv pip check`
- Backend targeted: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k "github_ci_checks_python_dependency_consistency or github_ci_applies_migrations_to_live_postgres"`
- Backend contracts: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q`
  - 330 passed

## 남은 외부 blocker

- `api.agentfeed.dev` DNS 미해결.
- `https://agentfeed.dev/` root가 여전히 `/login`으로 stale redirect될 수 있음.
- 따라서 hosted readiness는 deployment/DNS가 준비되기 전까지 실패하는 것이 정상이며, 현재 local code gate는 fail-closed 방향으로 정렬됨.

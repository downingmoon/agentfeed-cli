---
title: Commercial Readiness Hardening - API Diagnostics CORS and Upload Intent Copy 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/cli
  - api-contract
status: done
aliases:
  - API Diagnostics CORS and Upload Intent Copy
---

# Commercial Readiness Hardening - API Diagnostics CORS and Upload Intent Copy 2026-06-03

관련: [[Active Tasks]], [[Integration - CLI Backend Frontend]], [[Commercial Readiness Hardening - Test Browser Guard and CI Dependency Gates 2026-06-03]]

## 배경

병렬 상용화 감사 결과 중 현재 코드와 충돌하지 않고 로컬에서 바로 개선 가능한 gap을 선별했다.

> [!info] 선별 기준
> 이미 해결된 backend origin/proxy hardening과, 기존 contract가 의도적으로 고정한 frontend logout failure policy는 반복하지 않았다. 이번 변경은 API 진단력, CORS integration contract, CLI upload intent 문구 명확화에 집중했다.

## 변경

- Frontend
  - API response body stream/read 실패를 빈 응답으로 뭉개지 않고 `ApiError(502)` diagnostic body에 bounded failure reason으로 보존.
  - `ReadableStream` read failure contract test 추가.
- Backend
  - configured frontend origin CORS preflight allow contract 추가.
  - unconfigured origin CORS preflight reject contract 추가.
- CLI docs
  - `agentfeed share` 설명을 human terminal `--yes`와 automation `--yes`/`--json` explicit upload intent 기준으로 명확화.
  - CI/non-interactive upload는 public publishing이 아니라 private review draft upload임을 명시.

## 검증

- CLI targeted: `npm test -- --run tests/share.test.ts`
- CLI full: `npm run build && npm run typecheck && npm test -- --run`
  - 23 files / 376 tests passed
- Frontend targeted: `npm run test:contracts`
- Frontend full build: `npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- Backend targeted: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k "cors_preflight"`
- Backend contracts: `uv run --locked --group dev ruff check . && uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q`
  - 332 passed

## 남은 외부 blocker

- `api.agentfeed.dev` DNS 미해결.
- `https://agentfeed.dev/` root stale `/login` redirect.
- Hosted readiness CI 실패는 위 외부 상태를 fail-closed로 정확히 드러내는 증거로 유지됨.

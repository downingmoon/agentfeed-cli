---
title: Commercial Readiness Hardening - Project Clear Smoke Gate 2026-06-01
aliases:
  - Project Clear Smoke Gate
  - Project PATCH Smoke E2E
status: done
date: 2026-06-01
tags:
  - agentfeed/dev
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
---

# Commercial Readiness Hardening - Project Clear Smoke Gate 2026-06-01

## 결과

> [!success]
> `agentfeed-dev` smoke E2E가 project `PATCH`의 omitted-vs-explicit-null semantics와 hydrated project detail DOM까지 검증합니다.

## 변경 요약

- `scripts/smoke-e2e.sh`가 CLI upload로 생성된 project id를 owner-authenticated worklog detail에서 가져옵니다.
- smoke가 project에 `description`, `repository_url`, `homepage_url`, `visibility`, `tags`를 seed합니다.
- `PATCH` body에서 nullable fields를 omit하면 기존 값이 유지되는지 확인합니다.
- `PATCH` body에서 `description`, `repository_url`, `homepage_url`을 explicit `null`로 보내면 clear되는지 확인합니다.
- clear 이후 public project detail API와 hydrated frontend project detail DOM에서 이전 description/repository/homepage 값이 노출되지 않는지 확인합니다.
- smoke의 ISO timestamp assertion이 Backend의 `Z` suffix response를 파싱할 수 있도록 보정했습니다.
- README의 smoke 설명에 project clear smoke gate를 추가했습니다.

## 계약 기준

> [!important]
> 이 smoke는 [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]의 코드 단위 계약을 실제 dev stack 흐름으로 승격합니다. Backend는 omitted field와 explicit `null`을 구분하고, Frontend는 clear 이후 public project detail에서 nullable field 값을 렌더하지 않아야 합니다.

> [!note]
> smoke의 frontend route 검증은 `/projects/{project_id}`를 사용합니다. owner-aware route는 product route로 유지하되, 이미 실행 중인 Next dev server가 새 nested route를 hot-load하지 못하는 경우를 피하기 위해 오래된 single-segment route로 hydrated DOM contract를 검증합니다.

## 검증

- `bash -n scripts/smoke-e2e.sh` in `agentfeed-dev` → passed
- `make test` in `agentfeed-dev` → passed
- `make smoke-e2e` in `agentfeed-dev` → passed
- Local dev DB cleanup: stale `agentfeed_smoke_%` rows from debug `AGENTFEED_SMOKE_KEEP=1` runs removed

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Project clear smoke gate]]
- [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]
- [[Commercial Readiness Hardening - Project Mutation Surface 2026-06-01]]
- [[Active Tasks#P1 후보]]

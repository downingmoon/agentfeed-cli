---
title: Commercial Readiness Hardening - Frontend Core API Compatibility Probes 2026-06-03
aliases:
  - Frontend core API compatibility probes
  - API compatibility metadata plus public endpoint gate
tags:
  - agentfeed/frontend
  - agentfeed/ci
  - agentfeed/commercial-readiness
  - agentfeed/contracts
status: completed
created: 2026-06-03
related:
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - Frontend Mock API Compatibility CI Gate 2026-06-02]]"
  - "[[Commercial Readiness Hardening - Hosted Evidence and Frontend Prod API Gate 2026-06-02]]"
---

# Frontend Core API Compatibility Probes

> [!success] Outcome
> Frontend API compatibility verification no longer treats `/v1/metadata` alone as sufficient evidence. The gate now also exercises core public API clients that users depend on at runtime.

## 변경 사항

- `scripts/check-api-compatibility.mjs` generated runner가 `system.metadata()` 이후 다음 public API를 추가 probe한다.
  - `feed.list({ limit: 1 })` → list envelope `data[]` + `pagination.has_more` 확인
  - `explore.tags()` → tag list array 확인
  - `explore.get()` → explore section core arrays 확인
- `scripts/mock-api-compatibility-check.mjs` mock server가 `/v1/metadata`, `/v1/feed`, `/v1/tags`, `/v1/explore` 요청을 각각 정확히 1회 기대한다.
- `scripts/check-api-compatibility.contract.test.mjs`에 source-level regression을 추가해 compatibility script가 metadata-only로 퇴행하지 않도록 고정했다.

## 검증

- [x] `npm run test:contracts`
- [x] `npm run check:api-compatibility:mock`
- [x] `npm run lint`
- [x] `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`

## 남은 외부 블로커

> [!warning]
> 이 변경은 로컬/CI 코드 경로를 보강한 것이다. hosted release readiness의 최종 통과는 여전히 `api.agentfeed.dev` DNS/deployment와 `https://agentfeed.dev/` root stale `/login` redirect 해소가 필요하다.

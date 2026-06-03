---
title: Commercial Readiness Hardening - Frontend Review Origin Navigation 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/review-origin
status: completed
aliases:
  - Frontend review_base_url navigation hardening
---

# Frontend Review Origin Navigation

> [!success]
> Frontend가 Backend metadata의 `review_base_url`을 호환성 체크에서만 검증하고 실제 worklog/review 링크에는 사용하지 않던 drift를 해소했다.

## 배경

- Backend는 `/v1/metadata.review_base_url`로 canonical review frontend origin을 제공한다.
- CLI는 publish/share 후 이 origin 기반 review URL을 열어 브라우저 handoff를 수행한다.
- Frontend는 이전까지 feed/search/dashboard/card/detail/review 화면에서 대부분 `/worklogs/...` 상대 경로를 직접 조립했다.
- split-host 또는 production review origin 전환 시 CLI/Backend 계약과 Frontend navigation이 달라질 위험이 있었다.

## 변경

- `normalizeReviewBaseUrl` 추가
  - HTTPS origin만 허용
  - local dev용 `http://localhost`, `http://127.0.0.1`, `http://[::1]` origin 허용
  - credentials/path/query/hash 포함 origin은 fail-closed
- `worklog-navigation` helper 추가
  - `worklogDetailHref`
  - `worklogReviewHref`
  - `navigateToWorklogDetail`
  - `navigateToWorklogReview`
- `AppContext`가 metadata compatibility 성공 시 canonical `reviewBaseUrl`을 상태로 노출
- Feed/Search/Profile/Project/Explore/Landing/Dashboard/Worklog detail/Worklog review 및 WorklogCard A/B/C가 centralized helper를 사용하도록 교체
- Dashboard recent worklog action URL도 safe relative action을 검증한 뒤 `review_base_url`을 적용
- 공유 링크 생성도 `reviewBaseUrl` origin을 우선 사용

## 테스트 증거

```bash
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build
```

- 계약 테스트 통과
- lint/TypeScript check 통과 (`npm run lint`가 `tsc --noEmit` 실행)
- production build 통과
- 별도 `npm run typecheck` 스크립트는 존재하지 않음

## 관련 관찰: 반복 테스트 중 review 브라우저 창이 계속 뜬 이유

`agentfeed publish`, `agentfeed share`, `agentfeed collect --upload` 흐름은 성공하면 사용자가 게시 전 privacy/review 화면을 확인할 수 있도록 review URL을 브라우저로 자동 open한다. 따라서 E2E나 수동 반복 테스트에서 실제 upload/publish 경로를 계속 실행하면 `http://localhost:3001/worklogs/<id>/review` 창이 반복해서 열릴 수 있다.

이 side effect는 CLI 쪽에서 이미 `--no-open-review`로 억제할 수 있게 보강했다. 자동화/반복 테스트에서는 `agentfeed publish --no-open-review` 또는 `agentfeed collect --upload --no-open-review`를 사용한다.

## 남은 외부 blocker

- `api.agentfeed.dev` DNS/deployment 준비가 아직 필요하다.
- hosted production compatibility/live smoke는 DNS가 준비된 후 재검증해야 한다.

## 관련 노트

- [[Commercial Readiness Hardening - CLI Review Auto Open Override 2026-06-03]]
- [[Commercial Readiness Hardening - Metadata Review URL Trust 2026-06-03]]
- [[Commercial Readiness Hardening - Backend Production Origin and Proxy Startup 2026-06-03]]

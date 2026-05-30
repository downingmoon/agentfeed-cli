---
title: Runtime Configuration
tags:
  - agentfeed/config
  - agentfeed/frontend
  - agentfeed/integration
aliases:
  - AgentFeed Runtime Config
  - Frontend API URL Safety
status: active
created: 2026-05-30
---

# Runtime Configuration

> [!abstract] 목적
> CLI, Backend, Frontend가 같은 API endpoint 계약을 바라보도록 runtime URL과 환경변수를 검증·정규화합니다.

## 2026-05-30 Frontend API URL normalization

> [!success]
> Frontend `NEXT_PUBLIC_API_URL`이 `/v1`을 포함하거나 trailing slash를 포함해도 `/v1/v1` endpoint를 만들지 않도록 정규화했습니다.

### 계약

- Frontend env의 의미는 **Backend API root**입니다.
- 실수로 `http://localhost:8001/v1/`처럼 CLI용 API base URL을 넣어도 root `http://localhost:8001`로 정규화합니다.
- `buildApiUrl('/feed', root)`는 항상 `${root}/v1/feed` 형식으로 만듭니다.
- `ftp://`, query/hash, URL credential 포함 값은 fetch 전에 실패합니다.
- GitHub OAuth 시작 URL도 같은 `buildApiUrl('/auth/github')` helper를 사용해 endpoint 중복을 피합니다.

### 검증

- RED: `npx tsc --noEmit --pretty false`가 `buildApiUrl` / `normalizeApiRoot` export 부재로 실패
- GREEN:
  - `npm run test:contracts`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`
  - `agentfeed-dev/scripts/test-all.sh`에 Frontend `npm run test:contracts`를 추가

> [!note]
> CLI는 `/v1` 포함 API base URL을 사용하고, Frontend는 API root를 사용하는 게 원칙입니다. 다만 현업 설정 실수를 흡수하기 위해 Frontend도 최종 `/v1` suffix는 root로 정규화합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 Frontend API URL normalization]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI API base URL validation]]
- [[Active Tasks#P1 후보]]

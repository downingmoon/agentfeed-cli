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

## 2026-05-30 CLI API POST timeout

> [!success]
> CLI `login`, `preview`, `publish`, `share --upload`에서 사용하는 POST 요청도 bounded timeout과 `AbortSignal`을 갖도록 보강했습니다.

### 계약

- `createCliAuthSession()` / `exchangeCliAuthSession()`은 fetch에 `AbortSignal`을 전달합니다.
- ingest preview/upload 요청도 fetch에 `AbortSignal`을 전달합니다.
- 기본 timeout은 30초입니다.
- `AGENTFEED_API_TIMEOUT_MS` 환경변수로 CLI API request timeout을 조정할 수 있습니다.
- upload timeout은 `API_REQUEST_TIMEOUT`으로 실패하고 local draft는 uploaded 상태로 표시하지 않습니다.
- timeout 외 네트워크 실패도 `API_REQUEST_FAILED`로 감싸 사용자에게 API 연결 문제를 명확히 전달합니다.

### 검증

- RED: `npx vitest run tests/api-hook.test.ts --testNamePattern "creates and exchanges|times out"`가 POST fetch signal 누락과 timeout 미처리로 실패
- GREEN:
  - `npx vitest run tests/api-hook.test.ts --testNamePattern "creates and exchanges|times out"`
  - `npm test -- --run`
  - `npm run typecheck`
  - `npm run build`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!note]
> health/token preflight는 기존 3초 timeout을 유지하고, 실제 POST 요청은 기본 30초 timeout을 사용합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 Frontend API URL normalization]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI API POST timeout]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI API base URL validation]]
- [[Active Tasks#P1 후보]]

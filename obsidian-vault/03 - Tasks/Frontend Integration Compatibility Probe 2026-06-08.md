---
title: Frontend Integration Compatibility Probe 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/contract
status: completed
---

# Frontend Integration Compatibility Probe 2026-06-08

## 목적

Frontend Settings가 Backend integration setup-guide API를 실제로 소비하게 되었으므로, mock/hosted compatibility gate도 해당 endpoint drift를 잡도록 확장했다.

관련 작업:

- [[Frontend Integration Setup Guide Surface 2026-06-08]]
- [[Backend Integration Guide CLI Contract 2026-06-08]]
- [[Integration - CLI Backend Frontend]]

## 수정 내용

### Frontend

- `scripts/check-api-compatibility.mjs`
  - `/me/integrations` unauthenticated standard error probe 추가.
  - `/integrations/codex/setup-guide` probe 추가.
  - setup guide 응답 shape 검증 추가: `type`, `title`, `steps[].order`, `steps[].title`, `steps[].body`, `steps[].code`.
  - evidence marker를 `me-integrations integration-setup-guide` 포함 형태로 확장.
- `scripts/mock-api-compatibility-check.mjs`
  - mock compatibility server에 `/v1/me/integrations`, `/v1/integrations/codex/setup-guide` 추가.
  - stop-after-metadata와 success request-count guard를 endpoint 확장에 맞게 갱신.
- contract tests
  - compatibility script가 Settings에서 소비하는 integration endpoints를 실제로 probe하는지 source guard 추가.

### Dev orchestration

- `scripts/check-openapi-contract.mjs`
  - Frontend Settings setup-guide rendering에 필요한 response field contract 추가.
- `scripts/test-all.sh`, `scripts/test-hosted-compatibility-smoke.sh`
  - Frontend compatibility marker expectation을 새 endpoint 범위와 동기화.

## 검증 evidence

> [!success] Frontend 검증 통과
> - `npm run test:contracts`
> - `npm run check:api-compatibility:mock`
> - `npm run lint`
> - `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build`

> [!success] Dev contract 검증 통과
> - `node --check scripts/check-openapi-contract.mjs`
> - `node scripts/check-openapi-contract.mjs`
> - `./scripts/test-hosted-compatibility-smoke.sh`

## 후행 과제

- [ ] 실제 credential이 있는 브라우저에서 `/settings` integration setup-guide rendering visual smoke를 한 번 더 확인한다.
- [ ] production domain이 확정되면 hosted compatibility smoke를 IP-only가 아닌 최종 URL 기준으로 재실행한다.

## 개인서버 배포 evidence

> [!success] 2026-06-08 개인서버 배포 완료
> - `make server-up`
> - `cd /home/ubuntu/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate frontend && docker compose --env-file .env ps` *(server-local path; older off-server SSH notes targeted this same server)*
> - Frontend container health: `healthy`
> - `AGENTFEED_ALLOW_INSECURE_API=1 NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 ./scripts/smoke-hosted-compatibility.sh`
> - Smoke marker: `HOSTED_COMPATIBILITY_SMOKE_PASSED`
> - API probe marker: `FRONTEND_API_PROBES_PASSED metadata feed auth-me me-settings me-notifications me-integrations integration-setup-guide projects check-username search tags explore`

---
title: Frontend Setup Guide Payload Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/settings
status: completed
---

# Frontend Setup Guide Payload Guard 2026-06-08

## 목적

[[Frontend Integration Setup Guide Surface 2026-06-08]]와 [[Frontend Integration Compatibility Probe 2026-06-08]] 이후 Settings UI는 Backend setup-guide endpoint를 실제로 렌더링한다.

이번 작업은 Hosted compatibility probe가 endpoint drift를 잡더라도, 런타임에서 malformed guide payload가 `guide.steps.map`까지 도달해 Settings 전체를 crash시키지 않도록 API client boundary에 fail-closed guard를 추가한 것이다.

## 변경 내용

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeIntegrationGuide(value, requestedType)` 추가.
  - `type`, `title`, `steps[].order`, `steps[].title`, `steps[].body`, `steps[].code`를 런타임 검증.
  - `integrations.setupGuide(type)`가 raw `data`를 그대로 반환하지 않고 normalizer를 통과하도록 변경.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid setup guide command snippet 보존 검증.
  - `steps: null`, string `order`, empty `title` 같은 malformed payload fail-closed 검증.
  - `integrations.setupGuide('codex')`가 malformed backend guide payload를 거부하는지 fetch mock으로 검증.

## RED / GREEN

> [!failure] RED
> `npm run test:contracts`가 `normalizeIntegrationGuide` 미구현으로 실패했다.

> [!success] GREEN
> - `npm run test:contracts`
> - `npm run check:api-compatibility:mock`
> - `npm run lint`
> - `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build`

## 후행 과제

- [ ] 실제 credential이 있는 브라우저에서 `/settings` setup-guide section을 한 번 더 visual smoke한다.
- [ ] setup-guide response schema가 확장될 때는 Backend Pydantic schema, Frontend normalizer, compatibility probe, Dev OpenAPI field contract를 같은 루프에서 갱신한다.

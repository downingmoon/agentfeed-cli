---
title: Frontend Integration Guide Extra Field Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - integration
  - settings
  - contract
  - verification
status: completed
related:
  - "[[Frontend Settings Response Extra Field Guard 2026-06-09]]"
  - "[[Frontend Integration Compatibility Probe 2026-06-08]]"
  - "[[Integration Type Contract Guard 2026-06-08]]"
---

# Frontend Integration Guide Extra Field Guard 2026-06-09

> [!success] 완료
> Frontend setup-guide normalizer가 Backend `IntegrationGuide` / `IntegrationGuideStep` strict schema보다 넓은 응답을 조용히 무시하지 않고 fail-closed 하도록 보강했다.

## 배경

Backend `IntegrationGuide`와 `IntegrationGuideStep`는 `extra="forbid"` 계약이다. Settings 화면은 이 응답을 그대로 렌더링해 CLI command snippet과 setup step을 보여주므로, `debug`, `secret`, `raw_payload` 같은 예상 외 필드가 섞이면 Frontend API boundary에서 즉시 감지해야 한다.

기존 `normalizeIntegrationGuide()`는 필수 필드와 type mismatch는 검증했지만 root/step extra field는 버릴 수 있었다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `INTEGRATION_GUIDE_FIELDS = ['type', 'title', 'steps']` 추가.
  - `INTEGRATION_GUIDE_STEP_FIELDS = ['order', 'title', 'body', 'code']` 추가.
  - `rejectUnexpectedIntegrationGuideKeys()` 추가.
  - setup-guide root와 step object 모두 unexpected key를 `Integration setup guide contract mismatch`로 거부.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - guide root `debug` field 거부 테스트 추가.
  - guide step `secret` field 거부 테스트 추가.
  - `integrations.setupGuide()` client mock도 step extra field drift를 거부하도록 회귀 테스트 강화.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - setup-guide root/step field allowlist와 reject calls를 source contract로 고정.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts
# passed

npm test
# contract tests passed

npm run lint
# tsc --noEmit passed

NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
npm run build
# Next.js production build passed

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
```

## 배포

2026-06-09 사용자 요청에 따라 개인서버 `161.33.171.81`에 1회 배포했다. `agentfeed-dev/scripts/server-deploy.sh --execute --up` 경로로 4개 레포를 rsync했고, frontend production build 반영을 위해 `docker compose --env-file .env up -d --force-recreate frontend`를 추가 실행했다.

검증:

```bash
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
./scripts/smoke-hosted-compatibility.sh
# HOSTED_COMPATIBILITY_SMOKE_PASSED
```

## 후행 과제

- [ ] Backend integration guide schema에 신규 field가 추가되면 Frontend guide allowlist, contract tests, Dev OpenAPI gate를 같은 변경 범위에서 갱신한다.
- [ ] Settings integration guide browser smoke에서 strict parser 이후 guide rows/snippets가 정상 렌더링되는지 다음 UI pass에서 확인한다.
- [ ] Integration status list row도 root extra field를 모두 fail-closed 하는지 다음 contract audit에서 재점검한다.

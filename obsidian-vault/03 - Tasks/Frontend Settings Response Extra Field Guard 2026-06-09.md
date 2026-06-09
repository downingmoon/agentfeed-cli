---
title: Frontend Settings Response Extra Field Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - settings
  - contract
  - privacy
  - verification
status: completed
related:
  - "[[Frontend User Response Extra Field Guard 2026-06-09]]"
  - "[[Frontend Settings Profile Error Detail 2026-06-09]]"
  - "[[Settings Username Boundary Validation Guard 2026-06-09]]"
---

# Frontend Settings Response Extra Field Guard 2026-06-09

> [!success] 완료
> Frontend settings response normalizer가 Backend settings schema보다 넓은 응답을 조용히 무시하지 않고 fail-closed 하도록 보강했다.

## 배경

Settings payload는 privacy defaults, public metric exposure, notification preferences처럼 사용자 설정과 개인정보 노출 정책을 직접 제어한다. 기존 Frontend normalizer는 필요한 필드만 읽고 나머지 key를 버릴 수 있었기 때문에, Backend drift나 `private_total_tokens`, `raw_email`, `raw_debug_payload` 같은 private/debug field 혼입을 Settings UI 단계에서 탐지하지 못할 수 있었다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `PRIVACY_SETTINGS_FIELDS` allowlist 추가.
  - `NOTIFICATION_SETTINGS_FIELDS` allowlist 추가.
  - `USER_SETTINGS_FIELDS = ['privacy', 'notifications']` root allowlist 추가.
  - `normalizePrivacySettings()`, `normalizeNotificationSettings()`, `normalizeUserSettings()`에서 unexpected key를 `settings response contract mismatch`로 거부.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - settings root extra `raw_debug_payload` 거부 테스트 추가.
  - privacy extra `private_total_tokens` 거부 테스트 추가.
  - notification extra `raw_email` 거부 테스트 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - settings response field allowlist와 reject call을 source contract로 고정.

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

서버 배포는 goal 필수 규칙에 따라 실시하지 않았다.

## 후행 과제

- [ ] Backend settings schema에 신규 설정 필드가 추가되면 Frontend allowlist, tests, Dev OpenAPI gate를 같은 변경 범위에서 갱신한다.
- [ ] Settings page browser smoke에서 privacy/notification save partial success UX가 strict response 이후에도 자연스럽게 보이는지 다음 UI pass에서 확인한다.
- [ ] Ingestion token settings endpoints도 root/row extra field를 모두 fail-closed 하는지 다음 contract audit에서 재점검한다.

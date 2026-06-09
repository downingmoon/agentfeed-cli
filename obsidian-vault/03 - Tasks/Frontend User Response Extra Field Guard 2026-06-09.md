---
title: Frontend User Response Extra Field Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - backend
  - contract
  - privacy
  - verification
status: completed
related:
  - "[[User Public Handle Display Guard 2026-06-09]]"
  - "[[Frontend Worklog Author Generic Fallback Guard 2026-06-09]]"
  - "[[User Account Response Guard 2026-06-08]]"
---

# Frontend User Response Extra Field Guard 2026-06-09

> [!success] 완료
> Frontend API user normalizer가 Backend public/auth user schema보다 넓은 응답을 조용히 무시하지 않고 fail-closed 하도록 보강했다.

## 배경

Backend schema/test는 public user 계열 응답에서 `email` 같은 private field가 섞이는 것을 금지한다. 그러나 Frontend `normalizeUserForContract()`는 기존에 필요한 user field만 읽고 나머지 key를 버렸기 때문에, Backend drift나 민감 필드 혼입을 API client 단계에서 탐지하지 못할 수 있었다.

Enterprise 완성도 기준에서는 user identity payload가 public UI 전반(feed, search, explore, leaderboard, auth.me)에 재사용되므로, schema별 허용 필드가 명시되어야 한다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `API_USER_CONTRACT_FIELDS` allowlist 추가.
  - `normalizeUserForContract()`가 unexpected key를 `rejectUnexpectedKeysForContract()`로 거부.
  - schema별 확장 필드만 명시 허용:
    - public profile / leaderboard user: `stats`, `viewer_state`
    - auth.me: `timezone`, `created_at`, `updated_at`
    - explore rising builder: `recent_worklog_count`
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - `normalizeUserPublic()`가 `email` extra field를 거부하는 직접 테스트 추가.
  - `auth.me` fetch response에 `email`이 포함되면 `auth.me response contract mismatch`로 실패하는 테스트 추가.
  - feed worklog author, search prompt author, explore project owner/rising builder extra `email` 거부 테스트 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - user field allowlist와 schema별 explicit extra allow를 source contract로 고정.

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

- [ ] Backend user schema가 신규 public field를 추가하면 Frontend `API_USER_CONTRACT_FIELDS`, Dev OpenAPI gate, 관련 page-source contract를 같은 변경 범위에서 갱신한다.
- [ ] `/me/settings`처럼 user-like payload가 별도 schema를 갖는 경계도 private field 혼입을 fail-closed 하는지 다음 audit에서 확인한다.
- [ ] Browser smoke에서 feed/search/explore/leaderboard가 정상 user payload를 계속 렌더링하는지 다음 UI pass에서 확인한다.

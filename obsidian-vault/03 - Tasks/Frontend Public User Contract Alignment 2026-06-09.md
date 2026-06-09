---
title: Frontend Public User Contract Alignment 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - contract
  - feed
  - explore
  - deployment
status: completed
related:
  - "[[Frontend Integration Guide Extra Field Guard 2026-06-09]]"
  - "[[Frontend User Response Extra Field Guard 2026-06-09]]"
---

# Frontend Public User Contract Alignment 2026-06-09

> [!success] 완료
> Hosted compatibility smoke에서 발견된 Frontend-Backend `PublicUser` 계약 불일치를 수정하고 개인서버에 재배포했다.

## 발견

개인서버 `http://161.33.171.81:13030` 배포 후 hosted compatibility smoke가 Frontend diagnostic helper 단계에서 실패했다.

실패 원인:

- `GET /v1/feed?limit=1`의 `WorklogCard.author`는 Backend schema상 `PublicUser`다.
- `GET /v1/explore`의 `rising_builders`는 Backend `RisingBuilder(PublicUser)`다.
- Backend `PublicUser`는 `stats`, `viewer_state`를 허용하지만 Frontend는 일부 nested author/builder를 기본 `User`로 파싱해 `stats`를 unexpected field로 거부했다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiWorklogCard.author`를 `ApiUserPublic`로 정렬.
  - `normalizePublicUserForContract()` 공용 helper 추가.
  - Worklog card/detail author를 Backend `PublicUser`로 파싱.
  - Explore rising builder를 `PublicUser + recent_worklog_count`로 파싱.
  - Project owner 같은 기본 `User` payload는 좁은 parser를 유지해 암묵적으로 넓히지 않음.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - Feed worklog card/detail author가 `stats`, `viewer_state`를 포함하는 케이스를 추가.
  - malformed public author stats는 계속 fail-closed 하도록 테스트 추가.
  - adapter fixture에서 project owner와 worklog public author를 분리.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Worklog card/detail/rising builder가 shared PublicUser parser를 쓰도록 source contract 고정.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts
# passed

npm test
# passed

npm run lint
# tsc --noEmit passed

NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
npm run build
# Next.js production build passed

NEXT_PUBLIC_API_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
npm run check:api-compatibility
# FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
```

## 배포

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
make server-up
ssh trading-bot "cd ~/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate frontend"

AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
./scripts/smoke-hosted-compatibility.sh
# HOSTED_COMPATIBILITY_SMOKE_PASSED
```

## 후행 과제

- [ ] Dev OpenAPI gate가 nested `PublicUser` usage를 더 명시적으로 분류할 수 있는지 다음 contract audit에서 확인한다.
- [ ] Browser visual smoke에서 `/feed`, `/explore`, `/profile/downingmoon`의 GitHub avatar와 public user metadata 렌더링을 확인한다.

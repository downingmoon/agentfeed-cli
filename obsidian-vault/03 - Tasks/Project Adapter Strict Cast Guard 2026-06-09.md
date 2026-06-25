---
title: Project Adapter Strict Cast Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/frontend
  - contract-guard
  - verification
status: done
aliases:
  - Project Adapter Strict Cast Guard
---

# Project Adapter Strict Cast Guard 2026-06-09

> [!success] 완료
> Frontend project/worklog adapter의 broad cast 경계를 줄이고, raw/extra payload가 UI까지 조용히 통과하지 못하도록 fail-closed 검증을 추가했다.

## 변경 요약

- [[Frontend Contract Guard]] 관점에서 `src/lib/adapters.ts`의 다음 raw cast를 제거했다.
  - `ApiWorklogSocialStats`
  - `ApiProjectStats`
  - `ApiProjectSummary`
  - `ApiProjectDetail`
  - `ApiProjectMutationResponse`
- `assertKnownFields` allowlist 검증을 추가했다.
  - worklog social count는 지정된 count 필드만 허용.
  - project stats는 공개 통계 필드만 허용.
  - project summary/detail/mutation은 endpoint별 허용 필드만 통과.
  - project owner는 공개 `ApiUser` 필드만 재구성하여 `email` 같은 사설 필드 유입을 차단.
- `src/lib/api-contract.test.ts`에 regression case를 추가했다.
  - social raw count payload
  - project row raw debug payload
  - project owner private email
  - project stats raw aggregate/debug field
  - mutation response raw/debug field

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts
npm run lint
rg -n "return value as unknown as ApiWorklogSocialStats|return value as unknown as ApiProjectStats|return value as unknown as ApiProjectSummary|as ApiProjectDetail|as ApiProjectMutationResponse" src/lib/adapters.ts || true
```

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

> [!note] 결과
> Targeted frontend contract tests, TypeScript lint, OpenAPI contract gate 모두 통과했다. raw cast 검색도 no-match였다.

## 후속 메모

- 이번 패스는 새 기능 추가가 아니라 기존 adapter boundary의 완성도 보강이다.
- 사용자가 명시적으로 요청하여, 작업 완료 후 개인서버 배포를 1회 진행한다.

## 개인서버 배포 증거

> [!success] 배포 완료
> 사용자의 명시 요청에 따라 개인서버 `161.33.171.81`에 1회 배포했다.

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
make server-up
cd /home/ubuntu/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate frontend
```

### 배포 후 확인

```bash
curl -fsS http://161.33.171.81:13030/
curl -fsS http://161.33.171.81:18080/v1/metadata
curl -fsS http://161.33.171.81:18080/health/ready
curl -fsS http://161.33.171.81:18080/v1/health/ready
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
npm run check:api-compatibility
```

> [!note] 결과
> Frontend root `200 OK`, Backend readiness 정상, metadata `v1 / 2026-06-03`, Frontend API compatibility probe 전체 통과. 서버의 synced source에서도 `PROJECT_STATS_FIELDS` strict guard를 확인했다.

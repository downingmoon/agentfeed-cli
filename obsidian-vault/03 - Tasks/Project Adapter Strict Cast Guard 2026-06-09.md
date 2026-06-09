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

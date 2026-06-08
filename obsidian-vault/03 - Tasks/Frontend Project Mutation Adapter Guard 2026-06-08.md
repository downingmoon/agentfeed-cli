---
title: Frontend Project Mutation Adapter Guard 2026-06-08
aliases:
  - Project mutation adapter guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/project
  - agentfeed/evidence
---

# Frontend Project Mutation Adapter Guard 2026-06-08

> [!success] 완료
> Project create/update response를 read-list/detail adapter와 섞지 않고, mutation response 전용 adapter를 통해 fail-closed 처리하도록 보강했다.

## 발견한 문제

- `projects.create` 성공 후 `adaptProjectSummary(created)`를 사용해 mutation response의 `repository_url`, `homepage_url`, `created_at`, `updated_at` 의미가 list summary adapter에서 사라질 수 있었다.
- `ProjectDetailPage` update success path가 response를 수동 매핑하면서 `tags: Array.isArray(updated.tags) ? updated.tags : []`, `updated_at ?? project.updatedAt`, `owner_id ?? project.ownerId` 같은 fallback을 갖고 있었다.
- API normalizer가 이미 엄격하더라도 page-level fallback은 future bypass/refactor에서 malformed mutation response를 조용히 숨길 수 있다.

## 변경 요약

- `agentfeed-frontend/src/lib/adapters.ts`
  - `assertNormalizedProjectMutationResponse` 추가.
  - mutation response의 `owner_id`, `slug`, nullable URL fields, required `tags`, ISO `created_at/updated_at`, optional `stats`, optional normalized owner를 검증.
  - `adaptProjectMutationResponse(response, previous?)` 추가.
  - mutation response가 stats를 생략/null로 반환하는 경우 update 화면의 기존 stats를 보존한다.
- `agentfeed-frontend/src/components/pages/ProjectsPage.tsx`
  - project create success path를 `adaptProjectMutationResponse(created)`로 교체.
- `agentfeed-frontend/src/components/pages/ProjectDetailPage.tsx`
  - project update success path의 수동 fallback mapping 제거.
  - `adaptProjectMutationResponse(updated, project)`로 교체.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - mutation adapter가 repo/homepage/timestamps/tags/stats를 보존하는 회귀 추가.
  - stats 없는 mutation response는 previous stats를 보존하는 회귀 추가.
  - malformed mutation response fail-closed 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - mutation adapter 사용과 fallback 제거 source regression 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 배포 상태

> [!info] 서버 배포 안 함
> 현재 active goal 규칙에 따라 이번 slice는 개인 서버 배포를 수행하지 않았다.

## 후행 과제

- [ ] Worklog review helper(`collection-evidence.ts`)가 API-normalized payload를 전제로 하더라도 malformed row filter로 계약 오류를 숨길 수 있는지 별도 source audit.
- [ ] Project create/update 성공 후 route target이 owner username missing 상태에서 의도대로 legacy project id route로 이동하는지 browser smoke 후보로 남김.

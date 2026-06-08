---
title: Frontend Project Mutation Route Guard 2026-06-08
aliases:
  - Project mutation route guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/project
  - agentfeed/routing
  - agentfeed/evidence
---

# Frontend Project Mutation Route Guard 2026-06-08

> [!success] 완료
> Project create success 후 owner username이 없는 mutation response는 owner-aware route가 아니라 legacy project id route로 이동한다는 계약을 회귀 테스트로 잠갔다.

## 확인한 계약

- owner username이 있으면 `projectHref(owner, slug)` → `/projects/:owner/:slug`.
- owner username이 없거나 null/blank이면 `projectHref(null, id)` → `/projects/:id`.
- `ProjectsPage` create success path는 `created.owner?.username ? created.slug : created.id`를 사용해 username-missing response에서 backend id route로 이동한다.

## 변경 요약

- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - `projectHref(null, 'project/id') === '/projects/project%2Fid'` 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `ProjectsPage` create success path가 `router.push(projectHref(created.owner?.username, created.owner?.username ? created.slug : created.id))`를 유지하도록 source regression 추가.

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

- [ ] 전체 CLI/API/Frontend contract completion audit을 별도 문서로 수행해 goal 완료 가능 여부를 requirement-by-requirement로 판정.
- [ ] Browser smoke는 로컬 mock/fixture 방식이 확정되면 project create owner-missing route를 실제 click flow로 확인.

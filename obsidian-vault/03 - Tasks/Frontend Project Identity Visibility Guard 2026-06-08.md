---
title: Frontend Project Identity Visibility Guard 2026-06-08
aliases:
  - Project identity visibility guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/project
  - agentfeed/evidence
---

# Frontend Project Identity Visibility Guard 2026-06-08

> [!success] 완료
> Project adapter가 `visibility`, `owner`, `owner_id`, `slug`, `tags` malformed payload를 route fallback 또는 public/private filtering으로 숨기지 않도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/adapters.ts`
  - `assertNormalizedProjectSummary` 추가.
  - Project summary/list adapter에서 `id`, `name`, `visibility`, optional `owner`, optional `owner_id`, optional `slug`, optional `tags`, optional `stats` shape 검증.
  - Project detail adapter에서 required `owner_id`, required `slug`, required `stats` 검증.
  - Public project adapter가 `visibility:'team'` 같은 malformed value를 private/unlisted처럼 drop하지 않고 fail-closed 하도록 변경.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - malformed project `visibility`, `tags`, `owner:null`, owner `display_name:''`, `owner_id:number` fail-closed 회귀 추가.
  - project detail `owner_id:undefined/null`, `slug:null` fail-closed 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - project list/detail adapter guard source regression 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 후행 과제

- [ ] Worklog `source/viewer_state` nullable 처리 중 API contract상 허용된 null과 masking fallback을 구분 점검.
- [ ] Project mutation response adapter는 read adapter와 다른 계약이므로 별도 점검.

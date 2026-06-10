---
title: Frontend Project Visibility Select Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/enterprise-readiness
status: done
aliases:
  - Project visibility select guard
---

# Frontend Project Visibility Select Guard 2026-06-10

> [!success]
> Project visibility를 선택하는 UI 이벤트 값을 raw string에서 `ProjectVisibility`로 바로 assertion하지 않고, 공통 parser를 통해 fail-closed 처리하도록 정리했다.

## 배경

[[Frontend Worklog Visibility Fallback Guard 2026-06-10]] 후속으로 Frontend에 남아 있는 visibility type assertion을 점검했다. 아래 UI surface에서 `event.target.value`를 바로 union type으로 assertion하는 경로가 남아 있었다.

- `ProjectsPage` create form
- `ProjectDetailPage` edit form
- `SettingsPage` default visibility rows

이 값들은 DOM 이벤트에서 들어오는 string이므로, API boundary와 같은 방식으로 명시 parser를 거쳐야 계약 drift나 잘못된 option injection을 숨기지 않는다.

## 변경

- `agentfeed-frontend` commit `5967f56 Parse project visibility selects explicitly`
- `src/lib/project-mutation-form.ts`
  - `projectVisibilityFromSelect(value: string): ProjectVisibility` 추가.
  - `PROJECT_VISIBILITY_OPTIONS`를 readonly option array로 축소.
- `ProjectsPage`, `ProjectDetailPage`, `SettingsPage`
  - `event.target.value as ProjectMutationForm['visibility']` 및 `as ProjectVisibility` 제거.
  - 모든 project visibility select가 공통 parser를 사용.
- `src/lib/project-visibility-source-contract.test.ts`
  - raw select assertion과 `as ProjectVisibility` 재도입을 contract test로 차단.

## 검증

- Red check: 새 source contract가 기존 `as ProjectVisibility`/select assertion에서 실패하는 것 확인.
- `npm run test:contracts` 통과.
- `npm run lint` 통과.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_TELEMETRY_DISABLED=1 npm run ci` 통과.
- `node scripts/check-openapi-contract.mjs` 통과.

> [!note]
> 이번 pass에서는 active goal rule에 맞춰 서버 배포를 수행하지 않았다.

## 후속 작업

- [ ] `ProjectsPage`의 sort select `event.target.value as SortKey`도 같은 방식의 parser로 정리할 수 있는지 다음 Frontend hardening pass에서 점검한다.
- [ ] `PROJECT_VISIBILITY_OPTIONS`를 설정 화면과 프로젝트 mutation form에서 공유하므로, 문구가 page context별로 달라져야 한다면 label/description 분리를 설계한다.

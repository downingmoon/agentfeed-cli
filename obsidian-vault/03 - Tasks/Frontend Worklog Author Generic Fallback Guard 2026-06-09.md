---
title: Frontend Worklog Author Generic Fallback Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - contract
  - profile
  - worklog
  - verification
status: completed
related:
  - "[[User Public Handle Display Guard 2026-06-09]]"
  - "[[Profile Account Public Handle Display Guard 2026-06-09]]"
  - "[[Project Owner Public Handle Display Guard 2026-06-09]]"
---

# Frontend Worklog Author Generic Fallback Guard 2026-06-09

> [!success] 완료
> Worklog author helper가 API-normalized `_author` 없이 legacy `author` 문자열만 받은 경우, 그 문자열을 공개 이름/handle처럼 표시하지 않고 generic fallback만 사용하도록 막았다.

## 배경

Frontend worklog card/detail은 정상 API 경로에서 `author` 객체를 strict normalizer로 받고 `_author`로 hydrate한다. 그러나 partial fixture, legacy payload, preview-like payload처럼 `_author`가 빠진 경우 `Worklog.author` 문자열을 fallback display identity로 사용하던 경계가 남아 있었다.

이 문자열은 과거 username key일 수도 있지만 Backend id 또는 내부 식별자일 수도 있으므로, Enterprise 완성도 기준에서는 공개 UI fallback으로 그대로 노출하면 안 된다.

## 변경

- `agentfeed-frontend/src/components/worklog/worklogAuthor.ts`
  - fallback author display를 `Unknown author`로 고정.
  - fallback username을 `unknown`으로 고정.
  - legacy `author` 문자열은 avatar gradient color seed로만 사용하고 공개 이름/handle에는 사용하지 않음.
  - hydrated `_author.avatarUrl`, `_author.name`, `_author.username` 우선 정책은 유지.
- `agentfeed-frontend/src/lib/worklog-author-avatar.contract.test.ts`
  - `_author`가 있는 경우 GitHub avatar/name/username을 유지하는 기존 계약 확인.
  - legacy-only `author: 'backend-user-id-only'`가 `Unknown author` / `unknown`으로만 노출되는 회귀 테스트 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - worklog author fallback이 legacy 문자열을 `name`/`username`으로 쓰지 않도록 source contract 추가.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/worklog-author-avatar.contract.test.ts src/lib/page-source-contract.test.ts
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

> [!info] Build env note
> `NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build`는 production build에서 localhost API를 금지하는 기존 env gate로 실패했다. 이는 의도된 보호 장치라서 IP-only server-test flag를 명시해 build를 재검증했다. 서버 배포는 하지 않았다.

## 후행 과제

- [ ] 실제 browser smoke에서 malformed/legacy-only worklog fixture가 generic fallback으로만 렌더링되는지 확인한다.
- [ ] `Worklog.author` legacy string field를 타입에서 제거할 수 있는지, API-normalized `_author` 전용 구조로 migration 가능한지 별도 검토한다.
- [ ] Landing preview/fixture payload가 API-normalized author shape를 쓰도록 정리할 수 있는지 다음 UI 계약 pass에서 확인한다.
